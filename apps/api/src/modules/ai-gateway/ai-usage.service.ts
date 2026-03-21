import {
  AITaskStatus,
  AITaskType,
  Prisma,
} from '@prisma/client';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import type { AiGatewayUsage } from './ai-gateway.types';

type CreateAiTaskRecordInput = {
  userId: string;
  taskType: AITaskType;
  targetType: string;
  targetId: string;
  providerConfigId?: string | null;
  modelConfigId?: string | null;
  inputSnapshotJson?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
};

type CompleteAiTaskRecordInput = {
  estimatedCostUsd?: number | null;
  outputSnapshotJson?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  usage: AiGatewayUsage;
};

type AiTokenPriceConfig = {
  inputTokenPriceUsd: Prisma.Decimal | number | string | null;
  outputTokenPriceUsd: Prisma.Decimal | number | string | null;
};

@Injectable()
export class AiUsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async assertWithinLimits(userId: string, taskType: AITaskType) {
    const now = new Date();
    const windowSeconds = this.configService.get<number>(
      'AI_GATEWAY_RATE_LIMIT_WINDOW_SECONDS',
      60,
    );
    const maxRequestsPerWindow = this.configService.get<number>(
      'AI_GATEWAY_MAX_REQUESTS_PER_WINDOW',
      20,
    );
    const dailyTokenLimit = this.configService.get<number>(
      'AI_GATEWAY_DAILY_TOKEN_LIMIT',
      2_000_000,
    );
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [recentRequestCount, dailyTokenUsage] = await Promise.all([
      this.prisma.aITaskRecord.count({
        where: {
          userId,
          createdAt: {
            gte: windowStart,
          },
        },
      }),
      this.prisma.aITaskRecord.aggregate({
        where: {
          userId,
          createdAt: {
            gte: dayStart,
          },
          status: AITaskStatus.SUCCESS,
        },
        _sum: {
          totalTokens: true,
        },
      }),
    ]);

    if (recentRequestCount >= maxRequestsPerWindow) {
      throw new HttpException(
        `AI request rate limit exceeded for task type ${taskType}. Window: ${windowSeconds}s, max requests: ${maxRequestsPerWindow}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if ((dailyTokenUsage._sum.totalTokens ?? 0) >= dailyTokenLimit) {
      throw new HttpException(
        `AI daily token budget exceeded for task type ${taskType}. Daily limit: ${dailyTokenLimit}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async createTaskRecord(input: CreateAiTaskRecordInput) {
    const now = new Date();

    return this.prisma.aITaskRecord.create({
      data: {
        userId: input.userId,
        taskType: input.taskType,
        targetType: input.targetType,
        targetId: input.targetId,
        providerConfigId: input.providerConfigId ?? null,
        modelConfigId: input.modelConfigId ?? null,
        status: AITaskStatus.RUNNING,
        inputSnapshotJson: input.inputSnapshotJson,
        startedAt: now,
      },
    });
  }

  async completeTaskRecord(
    taskRecordId: string,
    input: CompleteAiTaskRecordInput,
  ) {
    return this.prisma.aITaskRecord.update({
      where: {
        id: taskRecordId,
      },
      data: {
        status: AITaskStatus.SUCCESS,
        inputTokens: input.usage.inputTokens,
        outputTokens: input.usage.outputTokens,
        totalTokens: input.usage.totalTokens,
        estimatedCostUsd:
          input.estimatedCostUsd === undefined || input.estimatedCostUsd === null
            ? null
            : new Prisma.Decimal(input.estimatedCostUsd),
        outputSnapshotJson: input.outputSnapshotJson,
        finishedAt: new Date(),
      },
    });
  }

  async failTaskRecord(taskRecordId: string, errorMessage: string) {
    return this.prisma.aITaskRecord.update({
      where: {
        id: taskRecordId,
      },
      data: {
        status: AITaskStatus.FAILED,
        errorMessage,
        finishedAt: new Date(),
      },
    });
  }

  async recordRejectedTask(
    input: CreateAiTaskRecordInput & {
      errorMessage: string;
      rateLimitScope: string;
    },
  ) {
    const now = new Date();

    return this.prisma.aITaskRecord.create({
      data: {
        userId: input.userId,
        taskType: input.taskType,
        targetType: input.targetType,
        targetId: input.targetId,
        providerConfigId: input.providerConfigId ?? null,
        modelConfigId: input.modelConfigId ?? null,
        status: AITaskStatus.FAILED,
        inputSnapshotJson: input.inputSnapshotJson,
        errorMessage: input.errorMessage,
        rateLimitScope: input.rateLimitScope,
        startedAt: now,
        finishedAt: now,
      },
    });
  }

  calculateEstimatedCost(
    model: AiTokenPriceConfig,
    usage: AiGatewayUsage,
  ) {
    const inputPrice =
      model.inputTokenPriceUsd === null
        ? null
        : new Prisma.Decimal(model.inputTokenPriceUsd);
    const outputPrice =
      model.outputTokenPriceUsd === null
        ? null
        : new Prisma.Decimal(model.outputTokenPriceUsd);
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;

    if (inputPrice === null && outputPrice === null) {
      return null;
    }

    const totalCost = new Prisma.Decimal(0)
      .add(
        inputPrice
          ? new Prisma.Decimal(inputTokens)
              .mul(inputPrice)
              .div(1000)
          : 0,
      )
      .add(
        outputPrice
          ? new Prisma.Decimal(outputTokens)
              .mul(outputPrice)
              .div(1000)
          : 0,
      );

    return totalCost.toNumber();
  }

  async listTaskRecords(userId: string, limit = 20) {
    const records = await this.prisma.aITaskRecord.findMany({
      where: {
        userId,
      },
      include: {
        providerConfig: true,
        modelConfig: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return records.map((record) => ({
      id: record.id,
      taskType: record.taskType,
      targetType: record.targetType,
      targetId: record.targetId,
      status: record.status,
      errorMessage: record.errorMessage,
      rateLimitScope: record.rateLimitScope,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      totalTokens: record.totalTokens,
      estimatedCostUsd: this.serializeDecimal(record.estimatedCostUsd),
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      provider: record.providerConfig
        ? {
            id: record.providerConfig.id,
            name: record.providerConfig.name,
            providerType: record.providerConfig.providerType,
          }
        : null,
      model: record.modelConfig
        ? {
            id: record.modelConfig.id,
            modelCode: record.modelConfig.modelCode,
            displayName: record.modelConfig.displayName,
          }
        : null,
    }));
  }

  async getUsageSummary(userId: string, days = 30) {
    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const windowSeconds = this.configService.get<number>(
      'AI_GATEWAY_RATE_LIMIT_WINDOW_SECONDS',
      60,
    );
    const maxRequestsPerWindow = this.configService.get<number>(
      'AI_GATEWAY_MAX_REQUESTS_PER_WINDOW',
      20,
    );
    const dailyTokenLimit = this.configService.get<number>(
      'AI_GATEWAY_DAILY_TOKEN_LIMIT',
      2_000_000,
    );
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [records, recentWindowCalls, dailyTokenUsage] = await Promise.all([
      this.prisma.aITaskRecord.findMany({
        where: {
          userId,
          createdAt: {
            gte: since,
          },
        },
        include: {
          providerConfig: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.aITaskRecord.count({
        where: {
          userId,
          createdAt: {
            gte: windowStart,
          },
        },
      }),
      this.prisma.aITaskRecord.aggregate({
        where: {
          userId,
          createdAt: {
            gte: dayStart,
          },
          status: AITaskStatus.SUCCESS,
        },
        _sum: {
          totalTokens: true,
        },
      }),
    ]);

    const byTaskType = new Map<
      string,
      {
        taskType: string;
        calls: number;
        successCalls: number;
        failedCalls: number;
        totalTokens: number;
        estimatedCostUsd: number;
      }
    >();
    const byProvider = new Map<
      string,
      {
        providerConfigId: string;
        providerName: string;
        providerType: string;
        calls: number;
        totalTokens: number;
        estimatedCostUsd: number;
      }
    >();

    let totalCalls = 0;
    let successCalls = 0;
    let failedCalls = 0;
    let rateLimitedCalls = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;
    let totalEstimatedCostUsd = 0;

    for (const record of records) {
      totalCalls += 1;
      successCalls += record.status === AITaskStatus.SUCCESS ? 1 : 0;
      failedCalls += record.status === AITaskStatus.FAILED ? 1 : 0;
      rateLimitedCalls += record.rateLimitScope ? 1 : 0;
      totalInputTokens += record.inputTokens ?? 0;
      totalOutputTokens += record.outputTokens ?? 0;
      totalTokens += record.totalTokens ?? 0;
      totalEstimatedCostUsd += this.serializeDecimal(record.estimatedCostUsd) ?? 0;

      const taskEntry = byTaskType.get(record.taskType) ?? {
        taskType: record.taskType,
        calls: 0,
        successCalls: 0,
        failedCalls: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
      };
      taskEntry.calls += 1;
      taskEntry.successCalls += record.status === AITaskStatus.SUCCESS ? 1 : 0;
      taskEntry.failedCalls += record.status === AITaskStatus.FAILED ? 1 : 0;
      taskEntry.totalTokens += record.totalTokens ?? 0;
      taskEntry.estimatedCostUsd += this.serializeDecimal(record.estimatedCostUsd) ?? 0;
      byTaskType.set(record.taskType, taskEntry);

      if (record.providerConfigId && record.providerConfig) {
        const providerEntry = byProvider.get(record.providerConfigId) ?? {
          providerConfigId: record.providerConfigId,
          providerName: record.providerConfig.name,
          providerType: record.providerConfig.providerType,
          calls: 0,
          totalTokens: 0,
          estimatedCostUsd: 0,
        };
        providerEntry.calls += 1;
        providerEntry.totalTokens += record.totalTokens ?? 0;
        providerEntry.estimatedCostUsd +=
          this.serializeDecimal(record.estimatedCostUsd) ?? 0;
        byProvider.set(record.providerConfigId, providerEntry);
      }
    }

    return {
      rangeDays: days,
      totalCalls,
      successCalls,
      failedCalls,
      rateLimitedCalls,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalEstimatedCostUsd: Number(totalEstimatedCostUsd.toFixed(6)),
      byTaskType: [...byTaskType.values()].sort((left, right) =>
        left.taskType.localeCompare(right.taskType),
      ),
      byProvider: [...byProvider.values()].sort(
        (left, right) => right.calls - left.calls,
      ),
      limits: {
        windowSeconds,
        maxRequestsPerWindow,
        recentWindowCalls,
        remainingWindowRequests: Math.max(
          maxRequestsPerWindow - recentWindowCalls,
          0,
        ),
        dailyTokenLimit,
        dailyTokenUsage: dailyTokenUsage._sum.totalTokens ?? 0,
        remainingDailyTokens: Math.max(
          dailyTokenLimit - (dailyTokenUsage._sum.totalTokens ?? 0),
          0,
        ),
      },
    };
  }

  private serializeDecimal(value: Prisma.Decimal | null | undefined) {
    if (!value) {
      return null;
    }

    return value.toNumber();
  }
}
