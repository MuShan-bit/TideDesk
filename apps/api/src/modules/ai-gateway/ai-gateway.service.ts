import {
  AIProviderType,
  AITaskType,
  type AIModelConfig,
  type AIProviderConfig,
  type Prisma,
} from '@prisma/client';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiUsageService } from './ai-usage.service';
import {
  AI_PROVIDER_ADAPTERS,
  type AiGatewayRequest,
  type AiGatewayResult,
  type AiProviderAdapter,
} from './ai-gateway.types';

type ModelWithProvider = AIModelConfig & {
  provider: AIProviderConfig;
};

type AuditTaskRecordInput = Parameters<AiUsageService['createTaskRecord']>[0];

@Injectable()
export class AiGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly credentialCryptoService: CredentialCryptoService,
    private readonly aiUsageService: AiUsageService,
    @Inject(AI_PROVIDER_ADAPTERS)
    private readonly adapters: AiProviderAdapter[],
  ) {}

  async generateText(
    userId: string,
    request: AiGatewayRequest,
  ): Promise<AiGatewayResult> {
    if (request.messages.length === 0) {
      throw new BadRequestException('AI request requires at least one message');
    }

    const model = await this.resolveModel(
      userId,
      request.taskType,
      request.modelConfigId,
    );
    const auditInput = this.buildAuditInput(userId, model, request);

    try {
      await this.aiUsageService.assertWithinLimits(userId, request.taskType);
    } catch (error) {
      await this.aiUsageService.recordRejectedTask({
        ...auditInput,
        errorMessage:
          error instanceof Error ? error.message : 'AI rate limit exceeded',
        rateLimitScope: 'AI_GATEWAY',
      });

      throw error;
    }

    const taskRecord = await this.aiUsageService.createTaskRecord(auditInput);
    const adapter = this.resolveAdapter(model.provider.providerType);
    const timeoutMs =
      request.timeoutMs ??
      this.configService.get<number>('AI_PROVIDER_DEFAULT_TIMEOUT_MS', 30000);

    try {
      const result = await adapter.generateText({
        providerType: model.provider.providerType,
        baseUrl: model.provider.baseUrl,
        apiKey: this.credentialCryptoService.decrypt(
          model.provider.apiKeyEncrypted,
        ),
        modelCode: model.modelCode,
        messages: request.messages,
        responseFormat: request.responseFormat ?? 'text',
        timeoutMs,
        maxAttempts: request.maxAttempts,
        parameters: {
          ...this.normalizeParameters(model.parametersJson),
          ...(request.parameters ?? {}),
        },
      });
      const estimatedCostUsd = this.aiUsageService.calculateEstimatedCost(
        model,
        result.usage,
      );

      await this.aiUsageService.completeTaskRecord(taskRecord.id, {
        usage: result.usage,
        estimatedCostUsd,
        outputSnapshotJson: {
          text: result.text,
          finishReason: result.finishReason,
          usage: result.usage,
        },
      });

      return {
        modelConfigId: model.id,
        providerConfigId: model.providerConfigId,
        providerType: model.provider.providerType,
        modelCode: model.modelCode,
        displayName: model.displayName,
        text: result.text,
        finishReason: result.finishReason,
        usage: result.usage,
        rawResponseJson: result.rawResponseJson,
        estimatedCostUsd,
      };
    } catch (error) {
      await this.aiUsageService.failTaskRecord(
        taskRecord.id,
        error instanceof Error ? error.message : 'AI provider request failed',
      );

      throw error;
    }
  }

  async testProviderConnection(
    userId: string,
    providerConfigId: string,
    options: {
      modelCode?: string;
      modelConfigId?: string;
      timeoutMs?: number;
    } = {},
  ) {
    const provider = await this.prisma.aIProviderConfig.findFirst({
      where: {
        id: providerConfigId,
        userId,
      },
    });

    if (!provider) {
      throw new NotFoundException('AI provider config not found');
    }

    const model = await this.resolveProviderTestModel(userId, provider.id, {
      modelCode: options.modelCode,
      modelConfigId: options.modelConfigId,
    });
    const auditInput = {
      userId,
      taskType: model.taskType,
      targetType: 'AI_PROVIDER_TEST',
      targetId: provider.id,
      providerConfigId: provider.id,
      modelConfigId: model.modelConfigId,
      inputSnapshotJson: {
        providerConfigId: provider.id,
        modelCode: model.modelCode,
        timeoutMs: options.timeoutMs ?? 15_000,
      } satisfies Prisma.InputJsonValue,
    };
    const timeoutMs = options.timeoutMs ?? 15_000;

    try {
      await this.aiUsageService.assertWithinLimits(userId, model.taskType);
    } catch (error) {
      await this.aiUsageService.recordRejectedTask({
        ...auditInput,
        errorMessage:
          error instanceof Error ? error.message : 'AI rate limit exceeded',
        rateLimitScope: 'AI_GATEWAY',
      });

      throw error;
    }

    const taskRecord = await this.aiUsageService.createTaskRecord(auditInput);
    const adapter = this.resolveAdapter(provider.providerType);
    try {
      const result = await adapter.generateText({
        providerType: provider.providerType,
        baseUrl: provider.baseUrl,
        apiKey: this.credentialCryptoService.decrypt(provider.apiKeyEncrypted),
        modelCode: model.modelCode,
        messages: [
          {
            role: 'system',
            content: 'You are a connectivity check assistant.',
          },
          {
            role: 'user',
            content: 'Reply with OK only.',
          },
        ],
        responseFormat: 'text',
        timeoutMs,
        maxAttempts: 1,
        parameters: {},
      });
      const estimatedCostUsd = this.aiUsageService.calculateEstimatedCost(
        {
          inputTokenPriceUsd: model.inputTokenPriceUsd,
          outputTokenPriceUsd: model.outputTokenPriceUsd,
        } as Pick<
          AIModelConfig,
          'inputTokenPriceUsd' | 'outputTokenPriceUsd'
        >,
        result.usage,
      );

      await this.aiUsageService.completeTaskRecord(taskRecord.id, {
        usage: result.usage,
        estimatedCostUsd,
        outputSnapshotJson: {
          text: result.text,
          finishReason: result.finishReason,
          usage: result.usage,
        },
      });

      return {
        providerConfigId: provider.id,
        modelConfigId: model.modelConfigId,
        modelCode: model.modelCode,
        providerType: provider.providerType,
        text: result.text,
        finishReason: result.finishReason,
        usage: result.usage,
        rawResponseJson: result.rawResponseJson,
        estimatedCostUsd,
      };
    } catch (error) {
      await this.aiUsageService.failTaskRecord(
        taskRecord.id,
        error instanceof Error ? error.message : 'AI provider request failed',
      );

      throw error;
    }
  }

  listTaskRecords(userId: string, limit?: number) {
    return this.aiUsageService.listTaskRecords(userId, limit);
  }

  getUsageSummary(userId: string, days?: number) {
    return this.aiUsageService.getUsageSummary(userId, days);
  }

  private async resolveModel(
    userId: string,
    taskType: AiGatewayRequest['taskType'],
    modelConfigId?: string,
  ) {
    const where: Prisma.AIModelConfigWhereInput = modelConfigId
      ? {
          id: modelConfigId,
          enabled: true,
          provider: {
            userId,
            enabled: true,
          },
        }
      : {
          taskType,
          enabled: true,
          provider: {
            userId,
            enabled: true,
          },
        };

    const model = await this.prisma.aIModelConfig.findFirst({
      where,
      include: {
        provider: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    if (!model) {
      throw new NotFoundException(
        modelConfigId
          ? 'AI model config not found or not enabled'
          : `No enabled AI model config found for task type ${taskType}`,
      );
    }

    return model;
  }

  private async resolveProviderTestModel(
    userId: string,
    providerConfigId: string,
    options: {
      modelCode?: string;
      modelConfigId?: string;
    },
  ) {
    if (options.modelConfigId) {
      const model = await this.prisma.aIModelConfig.findFirst({
        where: {
          id: options.modelConfigId,
          providerConfigId,
          provider: {
            userId,
          },
        },
      });

      if (!model) {
        throw new NotFoundException('AI model config not found');
      }

      return {
        modelConfigId: model.id,
        modelCode: model.modelCode,
        taskType: model.taskType,
        inputTokenPriceUsd: model.inputTokenPriceUsd,
        outputTokenPriceUsd: model.outputTokenPriceUsd,
      };
    }

    if (options.modelCode) {
      return {
        modelConfigId: null,
        modelCode: options.modelCode,
        taskType: AITaskType.POST_CLASSIFY,
        inputTokenPriceUsd: null,
        outputTokenPriceUsd: null,
      };
    }

    const model = await this.prisma.aIModelConfig.findFirst({
      where: {
        providerConfigId,
        provider: {
          userId,
        },
      },
      orderBy: [
        { enabled: 'desc' },
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    if (!model) {
      throw new BadRequestException(
        'Testing a provider requires a model config or model code',
      );
    }

      return {
        modelConfigId: model.id,
        modelCode: model.modelCode,
        taskType: model.taskType,
        inputTokenPriceUsd: model.inputTokenPriceUsd,
        outputTokenPriceUsd: model.outputTokenPriceUsd,
      };
    }

  private resolveAdapter(providerType: AIProviderType) {
    const adapter = this.adapters.find((item) => item.supports(providerType));

    if (!adapter) {
      throw new BadRequestException(
        `No AI adapter registered for provider type ${providerType}`,
      );
    }

    return adapter;
  }

  private normalizeParameters(value: Prisma.JsonValue | null) {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private buildAuditInput(
    userId: string,
    model: ModelWithProvider,
    request: AiGatewayRequest,
  ): AuditTaskRecordInput {
    const inputSnapshotJson = {
      messages: this.toJsonCompatible(request.messages),
      responseFormat: request.responseFormat ?? 'text',
      parameters: this.toJsonCompatible(request.parameters ?? {}),
      ...(request.auditMetadata?.inputSnapshotJson !== undefined
        ? {
            inputSnapshot: this.toJsonCompatible(
              request.auditMetadata.inputSnapshotJson,
            ),
          }
        : {}),
    } as Prisma.InputJsonObject;

    return {
      userId,
      taskType: request.taskType,
      targetType:
        request.auditMetadata?.targetType ?? 'AI_GATEWAY_REQUEST',
      targetId: request.auditMetadata?.targetId ?? model.id,
      providerConfigId: model.providerConfigId,
      modelConfigId: model.id,
      inputSnapshotJson,
    };
  }

  private toJsonCompatible(value: unknown): Prisma.InputJsonValue | null {
    if (value === null) {
      return null;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
