import {
  AIProviderType,
  AITaskType,
  type AIModelConfig,
  type AIProviderConfig,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AiGatewayService } from './ai-gateway.service';
import type { AiProviderAdapter } from './ai-gateway.types';

function createProviderRecord(
  cryptoService: CredentialCryptoService,
  overrides: Partial<AIProviderConfig> = {},
): AIProviderConfig {
  return {
    id: 'provider-001',
    userId: 'ai_owner',
    providerType: AIProviderType.OPENAI_COMPATIBLE,
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEncrypted: cryptoService.encrypt('sk-provider-secret'),
    enabled: true,
    createdAt: new Date('2026-03-21T00:00:00.000Z'),
    updatedAt: new Date('2026-03-21T00:00:00.000Z'),
    ...overrides,
  };
}

function createModelRecord(
  provider: AIProviderConfig,
  overrides: Partial<AIModelConfig> = {},
) {
  return {
    id: 'model-001',
    providerConfigId: provider.id,
    modelCode: 'openrouter/auto',
    displayName: 'Classifier',
    taskType: AITaskType.POST_CLASSIFY,
    isDefault: false,
    enabled: true,
    parametersJson: {
      temperature: 0.2,
    },
    inputTokenPriceUsd: null,
    outputTokenPriceUsd: null,
    createdAt: new Date('2026-03-21T00:05:00.000Z'),
    updatedAt: new Date('2026-03-21T00:05:00.000Z'),
    provider,
    ...overrides,
  };
}

describe('AiGatewayService', () => {
  let service: AiGatewayService;
  let credentialCryptoService: CredentialCryptoService;
  let configService: ConfigService;
  let aiUsageService: {
    assertWithinLimits: jest.Mock;
    calculateEstimatedCost: jest.Mock;
    completeTaskRecord: jest.Mock;
    createTaskRecord: jest.Mock;
    failTaskRecord: jest.Mock;
    getUsageSummary: jest.Mock;
    listTaskRecords: jest.Mock;
    recordRejectedTask: jest.Mock;
  };
  let openAiAdapter: AiProviderAdapter;
  let anthropicAdapter: AiProviderAdapter;
  let geminiAdapter: AiProviderAdapter;
  let prisma: {
    aIProviderConfig: {
      findFirst: jest.Mock;
    };
    aIModelConfig: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultValue?: number) => {
        if (key === 'AI_PROVIDER_DEFAULT_TIMEOUT_MS') {
          return 30000;
        }

        return defaultValue;
      }),
      getOrThrow: jest.fn(() => 'demo-encryption-secret-key-1234'),
    } as unknown as ConfigService;

    credentialCryptoService = new CredentialCryptoService(configService);
    aiUsageService = {
      assertWithinLimits: jest.fn().mockResolvedValue(undefined),
      calculateEstimatedCost: jest.fn(() => 0.00009),
      completeTaskRecord: jest.fn().mockResolvedValue(undefined),
      createTaskRecord: jest.fn().mockResolvedValue({
        id: 'ai-task-001',
      }),
      failTaskRecord: jest.fn().mockResolvedValue(undefined),
      getUsageSummary: jest.fn(),
      listTaskRecords: jest.fn(),
      recordRejectedTask: jest.fn().mockResolvedValue(undefined),
    };

    openAiAdapter = {
      supports: jest.fn((providerType: AIProviderType) => {
        return (
          providerType === AIProviderType.OPENAI_COMPATIBLE ||
          providerType === AIProviderType.OPENAI
        );
      }),
      generateText: jest.fn().mockResolvedValue({
        text: '{"category":"AI"}',
        finishReason: 'stop',
        usage: {
          inputTokens: 20,
          outputTokens: 10,
          totalTokens: 30,
        },
        rawResponseJson: {
          id: 'chatcmpl-demo',
        },
      }),
    };
    anthropicAdapter = {
      supports: jest.fn((providerType: AIProviderType) => {
        return providerType === AIProviderType.ANTHROPIC;
      }),
      generateText: jest.fn().mockResolvedValue({
        text: '{"category":"Anthropic"}',
        finishReason: 'end_turn',
        usage: {
          inputTokens: 15,
          outputTokens: 8,
          totalTokens: 23,
        },
        rawResponseJson: {
          id: 'msg-demo',
        },
      }),
    };
    geminiAdapter = {
      supports: jest.fn((providerType: AIProviderType) => {
        return providerType === AIProviderType.GEMINI;
      }),
      generateText: jest.fn().mockResolvedValue({
        text: '{"category":"Gemini"}',
        finishReason: 'STOP',
        usage: {
          inputTokens: 14,
          outputTokens: 6,
          totalTokens: 20,
        },
        rawResponseJson: {
          id: 'gemini-demo',
        },
      }),
    };

    prisma = {
      aIProviderConfig: {
        findFirst: jest.fn(),
      },
      aIModelConfig: {
        findFirst: jest.fn(),
      },
    };

    service = new AiGatewayService(
      prisma as unknown as PrismaService,
      configService,
      credentialCryptoService,
      aiUsageService as never,
      [anthropicAdapter, geminiAdapter, openAiAdapter],
    );
  });

  it('resolves a task model and delegates to the matching provider adapter', async () => {
    const provider = createProviderRecord(credentialCryptoService);
    const model = createModelRecord(provider, {
      isDefault: true,
    });
    prisma.aIModelConfig.findFirst.mockResolvedValue(model);

    const result = await service.generateText('ai_owner', {
      taskType: AITaskType.POST_CLASSIFY,
      messages: [
        {
          role: 'system',
          content: 'You are a classifier',
        },
        {
          role: 'user',
          content: 'Categorize this post',
        },
      ],
      responseFormat: 'json_object',
      parameters: {
        max_tokens: 256,
      },
    });

    expect(prisma.aIModelConfig.findFirst).toHaveBeenCalledWith({
      where: {
        taskType: AITaskType.POST_CLASSIFY,
        enabled: true,
        provider: {
          userId: 'ai_owner',
          enabled: true,
        },
      },
      include: {
        provider: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    expect(openAiAdapter.generateText).toHaveBeenCalledWith({
      providerType: AIProviderType.OPENAI_COMPATIBLE,
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'sk-provider-secret',
      modelCode: 'openrouter/auto',
      messages: [
        {
          role: 'system',
          content: 'You are a classifier',
        },
        {
          role: 'user',
          content: 'Categorize this post',
        },
      ],
      responseFormat: 'json_object',
      timeoutMs: 30000,
      maxAttempts: undefined,
      parameters: {
        temperature: 0.2,
        max_tokens: 256,
      },
    });
    expect(aiUsageService.assertWithinLimits).toHaveBeenCalledWith(
      'ai_owner',
      AITaskType.POST_CLASSIFY,
    );
    expect(aiUsageService.createTaskRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'ai_owner',
        taskType: AITaskType.POST_CLASSIFY,
        providerConfigId: 'provider-001',
        modelConfigId: 'model-001',
      }),
    );
    expect(result).toEqual({
      modelConfigId: 'model-001',
      providerConfigId: 'provider-001',
      providerType: AIProviderType.OPENAI_COMPATIBLE,
      modelCode: 'openrouter/auto',
      displayName: 'Classifier',
      text: '{"category":"AI"}',
      finishReason: 'stop',
      usage: {
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
      },
      estimatedCostUsd: 0.00009,
      rawResponseJson: {
        id: 'chatcmpl-demo',
      },
    });
  });

  it('supports explicit model selection and rejects unsupported providers', async () => {
    const provider = createProviderRecord(credentialCryptoService, {
      providerType: AIProviderType.GEMINI,
      baseUrl: null,
    });
    const model = createModelRecord(provider, {
      id: 'model-explicit',
      providerConfigId: 'provider-gemini',
    });
    const anthropicProvider = createProviderRecord(credentialCryptoService, {
      id: 'provider-anthropic',
      providerType: AIProviderType.ANTHROPIC,
      name: 'Claude',
      baseUrl: null,
    });
    const anthropicModel = createModelRecord(anthropicProvider, {
      id: 'model-anthropic',
      providerConfigId: 'provider-anthropic',
      modelCode: 'claude-3-7-sonnet-latest',
      displayName: 'Claude Classifier',
    });
    prisma.aIModelConfig.findFirst
      .mockResolvedValueOnce(model)
      .mockResolvedValueOnce(anthropicModel)
      .mockResolvedValueOnce(null);

    await expect(
      service.generateText('ai_owner', {
        taskType: AITaskType.POST_CLASSIFY,
        modelConfigId: 'model-explicit',
        messages: [
          {
            role: 'user',
            content: 'Ping',
          },
        ],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        providerType: AIProviderType.GEMINI,
        text: '{"category":"Gemini"}',
      }),
    );
    expect(geminiAdapter.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: AIProviderType.GEMINI,
        modelCode: 'openrouter/auto',
      }),
    );

    await expect(
      service.generateText('ai_owner', {
        taskType: AITaskType.POST_CLASSIFY,
        modelConfigId: 'model-anthropic',
        messages: [
          {
            role: 'user',
            content: 'Ping',
          },
        ],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        providerType: AIProviderType.ANTHROPIC,
        text: '{"category":"Anthropic"}',
      }),
    );
    expect(anthropicAdapter.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: AIProviderType.ANTHROPIC,
        modelCode: 'claude-3-7-sonnet-latest',
      }),
    );

    await expect(
      service.generateText('ai_owner', {
        taskType: AITaskType.REPORT_SUMMARY,
        messages: [
          {
            role: 'user',
            content: 'Generate a summary',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prefers the default task model and can test provider connectivity', async () => {
    const provider = createProviderRecord(credentialCryptoService, {
      id: 'provider-openai',
      providerType: AIProviderType.OPENAI,
      baseUrl: null,
    });
    const fallbackModel = createModelRecord(provider, {
      id: 'model-fallback',
      modelCode: 'gpt-4.1-mini',
      displayName: 'Fallback',
      isDefault: false,
      createdAt: new Date('2026-03-21T00:01:00.000Z'),
      updatedAt: new Date('2026-03-21T00:01:00.000Z'),
    });
    const defaultModel = createModelRecord(provider, {
      id: 'model-default',
      modelCode: 'gpt-5.2',
      displayName: 'Primary',
      isDefault: true,
      createdAt: new Date('2026-03-21T00:02:00.000Z'),
      updatedAt: new Date('2026-03-21T00:02:00.000Z'),
    });

    prisma.aIModelConfig.findFirst
      .mockResolvedValueOnce(defaultModel)
      .mockResolvedValueOnce(defaultModel)
      .mockResolvedValueOnce(defaultModel);
    prisma.aIProviderConfig.findFirst.mockResolvedValue(provider);

    await service.generateText('ai_owner', {
      taskType: AITaskType.POST_CLASSIFY,
      messages: [
        {
          role: 'user',
          content: 'Use the default model',
        },
      ],
    });

    expect(prisma.aIModelConfig.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        taskType: AITaskType.POST_CLASSIFY,
        enabled: true,
        provider: {
          userId: 'ai_owner',
          enabled: true,
        },
      },
      include: {
        provider: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    await expect(
      service.testProviderConnection('ai_owner', provider.id, {
        modelConfigId: defaultModel.id,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        providerConfigId: provider.id,
        modelConfigId: defaultModel.id,
        modelCode: defaultModel.modelCode,
        providerType: AIProviderType.OPENAI,
        text: '{"category":"AI"}',
      }),
    );

    await expect(
      service.testProviderConnection('ai_owner', provider.id),
    ).resolves.toEqual(
      expect.objectContaining({
        providerConfigId: provider.id,
        modelConfigId: defaultModel.id,
        modelCode: defaultModel.modelCode,
      }),
    );

    expect(openAiAdapter.generateText).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        providerType: AIProviderType.OPENAI,
        baseUrl: null,
        modelCode: defaultModel.modelCode,
        maxAttempts: 1,
        timeoutMs: 15000,
      }),
    );
    expect(aiUsageService.completeTaskRecord).toHaveBeenCalled();
  });
});
