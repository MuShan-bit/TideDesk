import {
  AIProviderType,
  AITaskStatus,
  AITaskType,
  Prisma,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import { AiUsageService } from './ai-usage.service';

describe('AiUsageService', () => {
  let service: AiUsageService;
  let prisma: {
    aITaskRecord: {
      aggregate: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      aITaskRecord: {
        aggregate: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const configService = {
      get: jest.fn((key: string, defaultValue?: number) => {
        if (key === 'AI_GATEWAY_RATE_LIMIT_WINDOW_SECONDS') {
          return 60;
        }

        if (key === 'AI_GATEWAY_MAX_REQUESTS_PER_WINDOW') {
          return 3;
        }

        if (key === 'AI_GATEWAY_DAILY_TOKEN_LIMIT') {
          return 1000;
        }

        return defaultValue;
      }),
    } as unknown as ConfigService;

    service = new AiUsageService(
      prisma as unknown as PrismaService,
      configService,
    );
  });

  it('rejects calls when request window or daily token budgets are exceeded', async () => {
    prisma.aITaskRecord.count.mockResolvedValue(3);
    prisma.aITaskRecord.aggregate.mockResolvedValue({
      _sum: {
        totalTokens: 200,
      },
    });

    await expect(
      service.assertWithinLimits('ai_owner', AITaskType.POST_CLASSIFY),
    ).rejects.toMatchObject({
      status: 429,
    });

    prisma.aITaskRecord.count.mockResolvedValue(1);
    prisma.aITaskRecord.aggregate.mockResolvedValue({
      _sum: {
        totalTokens: 1000,
      },
    });

    await expect(
      service.assertWithinLimits('ai_owner', AITaskType.POST_CLASSIFY),
    ).rejects.toMatchObject({
      status: 429,
    });
  });

  it('calculates estimated cost, records tasks, and aggregates usage summaries', async () => {
    const createdRecord = {
      id: 'ai-task-001',
    };
    prisma.aITaskRecord.create.mockResolvedValue(createdRecord);
    prisma.aITaskRecord.update.mockResolvedValue({
      id: 'ai-task-001',
    });
    prisma.aITaskRecord.findMany.mockResolvedValue([
      {
        id: 'task-success',
        taskType: AITaskType.POST_CLASSIFY,
        targetType: 'ARCHIVED_POST',
        targetId: 'archive-001',
        status: AITaskStatus.SUCCESS,
        errorMessage: null,
        rateLimitScope: null,
        inputTokens: 120,
        outputTokens: 60,
        totalTokens: 180,
        estimatedCostUsd: new Prisma.Decimal('0.001800'),
        startedAt: new Date('2026-03-21T00:00:00.000Z'),
        finishedAt: new Date('2026-03-21T00:00:04.000Z'),
        createdAt: new Date('2026-03-21T00:00:00.000Z'),
        updatedAt: new Date('2026-03-21T00:00:04.000Z'),
        providerConfigId: 'provider-001',
        modelConfigId: 'model-001',
        providerConfig: {
          id: 'provider-001',
          name: 'OpenAI',
          providerType: AIProviderType.OPENAI,
        },
        modelConfig: {
          id: 'model-001',
          modelCode: 'gpt-5.2',
          displayName: 'GPT-5.2 Classifier',
        },
      },
      {
        id: 'task-rate-limited',
        taskType: AITaskType.POST_CLASSIFY,
        targetType: 'ARCHIVED_POST',
        targetId: 'archive-002',
        status: AITaskStatus.FAILED,
        errorMessage: 'AI request rate limit exceeded',
        rateLimitScope: 'AI_GATEWAY',
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        estimatedCostUsd: null,
        startedAt: new Date('2026-03-21T00:10:00.000Z'),
        finishedAt: new Date('2026-03-21T00:10:00.000Z'),
        createdAt: new Date('2026-03-21T00:10:00.000Z'),
        updatedAt: new Date('2026-03-21T00:10:00.000Z'),
        providerConfigId: 'provider-001',
        modelConfigId: 'model-001',
        providerConfig: {
          id: 'provider-001',
          name: 'OpenAI',
          providerType: AIProviderType.OPENAI,
        },
        modelConfig: {
          id: 'model-001',
          modelCode: 'gpt-5.2',
          displayName: 'GPT-5.2 Classifier',
        },
      },
    ]);
    prisma.aITaskRecord.count.mockResolvedValue(1);
    prisma.aITaskRecord.aggregate.mockResolvedValue({
      _sum: {
        totalTokens: 180,
      },
    });

    expect(
      service.calculateEstimatedCost(
        {
          inputTokenPriceUsd: new Prisma.Decimal('0.01'),
          outputTokenPriceUsd: new Prisma.Decimal('0.02'),
        },
        {
          inputTokens: 120,
          outputTokens: 60,
          totalTokens: 180,
        },
      ),
    ).toBe(0.0024);

    await expect(
      service.createTaskRecord({
        userId: 'ai_owner',
        taskType: AITaskType.POST_CLASSIFY,
        targetType: 'ARCHIVED_POST',
        targetId: 'archive-001',
        providerConfigId: 'provider-001',
        modelConfigId: 'model-001',
      }),
    ).resolves.toEqual(createdRecord);

    const summary = await service.getUsageSummary('ai_owner', 30);

    expect(summary).toEqual(
      expect.objectContaining({
        rangeDays: 30,
        totalCalls: 2,
        successCalls: 1,
        failedCalls: 1,
        rateLimitedCalls: 1,
        totalTokens: 180,
        totalEstimatedCostUsd: 0.0018,
        limits: expect.objectContaining({
          maxRequestsPerWindow: 3,
          recentWindowCalls: 1,
          dailyTokenUsage: 180,
          remainingDailyTokens: 820,
        }),
      }),
    );
    expect(summary.byTaskType).toEqual([
      expect.objectContaining({
        taskType: AITaskType.POST_CLASSIFY,
        calls: 2,
        totalTokens: 180,
      }),
    ]);
    expect(summary.byProvider).toEqual([
      expect.objectContaining({
        providerConfigId: 'provider-001',
        providerName: 'OpenAI',
        calls: 2,
        totalTokens: 180,
      }),
    ]);
  });
});
