import {
  AIProviderType,
  AITaskType,
  Prisma,
  type AIModelConfig,
  type AIProviderConfig,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AiConfigService } from './ai-config.service';

function createProviderRecord(
  cryptoService: CredentialCryptoService,
  overrides: Partial<AIProviderConfig> = {},
): AIProviderConfig {
  return {
    id: 'provider-001',
    userId: 'ai_owner',
    providerType: AIProviderType.OPENAI,
    name: 'OpenAI Default',
    baseUrl: null,
    apiKeyEncrypted: cryptoService.encrypt('sk-default-secret'),
    enabled: true,
    createdAt: new Date('2026-03-21T00:00:00.000Z'),
    updatedAt: new Date('2026-03-21T00:00:00.000Z'),
    ...overrides,
  };
}

function createModelRecord(
  overrides: Partial<AIModelConfig> = {},
): AIModelConfig {
  return {
    id: 'model-001',
    providerConfigId: 'provider-001',
    modelCode: 'gpt-5.2',
    displayName: 'GPT-5.2 classify',
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
    ...overrides,
  };
}

describe('AiConfigService', () => {
  let service: AiConfigService;
  let credentialCryptoService: CredentialCryptoService;
  let prisma: {
    $transaction: jest.Mock;
    aIProviderConfig: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    aIModelConfig: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    credentialCryptoService = new CredentialCryptoService({
      getOrThrow: jest.fn(() => 'demo-encryption-secret-key-1234'),
    } as unknown as ConfigService);

    prisma = {
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback(prisma),
      ),
      aIProviderConfig: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      aIModelConfig: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    service = new AiConfigService(
      prisma as unknown as PrismaService,
      credentialCryptoService,
    );
  });

  it('creates, lists and updates provider configs with encrypted api keys', async () => {
    const createdProvider = createProviderRecord(credentialCryptoService, {
      id: 'provider-openrouter',
      providerType: AIProviderType.OPENAI_COMPATIBLE,
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
    });
    const updatedProvider = {
      ...createdProvider,
      name: 'OpenRouter Primary',
      enabled: false,
      updatedAt: new Date('2026-03-21T01:00:00.000Z'),
    };

    prisma.aIProviderConfig.create.mockResolvedValue({
      ...createdProvider,
      models: [],
    });
    prisma.aIProviderConfig.findFirst.mockResolvedValue(createdProvider);
    prisma.aIModelConfig.findMany.mockResolvedValue([]);
    prisma.aIProviderConfig.update.mockResolvedValue({
      ...updatedProvider,
      models: [],
    });
    prisma.aIProviderConfig.findMany.mockResolvedValue([
      {
        ...updatedProvider,
        models: [],
      },
    ]);

    const provider = await service.createProvider('ai_owner', {
      providerType: AIProviderType.OPENAI_COMPATIBLE,
      name: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'sk-openrouter-secret',
      enabled: true,
    });

    const createArgs = prisma.aIProviderConfig.create.mock.calls[0][0];
    expect(createArgs.data.apiKeyEncrypted).not.toBe('sk-openrouter-secret');
    expect(
      credentialCryptoService.decrypt(createArgs.data.apiKeyEncrypted),
    ).toBe('sk-openrouter-secret');
    expect(provider).toEqual(
      expect.objectContaining({
        id: 'provider-openrouter',
        providerType: AIProviderType.OPENAI_COMPATIBLE,
        hasApiKey: true,
        models: [],
      }),
    );
    expect(provider).not.toHaveProperty('apiKeyEncrypted');

    const updated = await service.updateProvider('ai_owner', provider.id, {
      name: 'OpenRouter Primary',
      apiKey: 'sk-openrouter-rotated',
      enabled: false,
    });

    const updateArgs = prisma.aIProviderConfig.update.mock.calls[0][0];
    expect(
      credentialCryptoService.decrypt(updateArgs.data.apiKeyEncrypted),
    ).toBe('sk-openrouter-rotated');
    expect(updated).toEqual(
      expect.objectContaining({
        id: 'provider-openrouter',
        name: 'OpenRouter Primary',
        enabled: false,
        hasApiKey: true,
      }),
    );

    await expect(
      service.listProviders('ai_owner', {
        includeDisabled: true,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'provider-openrouter',
        enabled: false,
      }),
    ]);
  });

  it('creates, lists and updates model configs while enforcing provider ownership', async () => {
    const provider = createProviderRecord(credentialCryptoService, {
      id: 'provider-openai',
      providerType: AIProviderType.OPENAI,
      name: 'OpenAI Default',
    });
    const backupProvider = createProviderRecord(credentialCryptoService, {
      id: 'provider-gemini',
      providerType: AIProviderType.GEMINI,
      name: 'Gemini Backup',
      apiKeyEncrypted: credentialCryptoService.encrypt('gemini-secret'),
    });
    const otherProvider = createProviderRecord(credentialCryptoService, {
      id: 'provider-other',
      userId: 'ai_other',
      providerType: AIProviderType.ANTHROPIC,
      name: 'Anthropic Other',
      apiKeyEncrypted: credentialCryptoService.encrypt('anthropic-secret'),
    });
    const createdModel = {
      ...createModelRecord({
        providerConfigId: provider.id,
        inputTokenPriceUsd: new Prisma.Decimal('0.0015'),
        outputTokenPriceUsd: new Prisma.Decimal('0.006'),
      }),
      provider,
    };
    const existingModel = {
      ...createModelRecord({
        id: 'model-classifier',
        providerConfigId: provider.id,
      }),
      provider,
    };
    const updatedModel = {
      ...createModelRecord({
        id: 'model-classifier',
        providerConfigId: backupProvider.id,
        displayName: 'Gemini classify',
        enabled: false,
        parametersJson: {
          temperature: 0.1,
          topK: 20,
        },
      }),
      provider: backupProvider,
    };

    prisma.aIProviderConfig.findFirst
      .mockResolvedValueOnce(provider)
      .mockResolvedValueOnce(backupProvider)
      .mockResolvedValueOnce(null);
    prisma.aIModelConfig.create.mockResolvedValue(createdModel);
    prisma.aIModelConfig.findFirst.mockResolvedValue(existingModel);
    prisma.aIModelConfig.findMany
      .mockResolvedValueOnce([
        {
          id: createdModel.id,
          isDefault: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: updatedModel.id,
          isDefault: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          ...updatedModel,
          isDefault: false,
        },
      ]);
    prisma.aIModelConfig.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.aIModelConfig.findUniqueOrThrow
      .mockResolvedValueOnce({
        ...createdModel,
        isDefault: true,
      })
      .mockResolvedValueOnce({
        ...updatedModel,
        isDefault: false,
      });
    prisma.aIModelConfig.update.mockResolvedValue(updatedModel);

    const model = await service.createModel('ai_owner', {
      providerConfigId: provider.id,
      modelCode: 'gpt-5.2',
      displayName: 'GPT-5.2 classify',
      taskType: AITaskType.POST_CLASSIFY,
      enabled: true,
      isDefault: true,
      parametersJson: {
        temperature: 0.2,
      },
      inputTokenPriceUsd: 0.0015,
      outputTokenPriceUsd: 0.006,
    });

    expect(model.provider.id).toBe(provider.id);
    expect(model.isDefault).toBe(true);
    expect(model.parametersJson).toEqual({
      temperature: 0.2,
    });
    expect(model.inputTokenPriceUsd).toBe(0.0015);
    expect(model.outputTokenPriceUsd).toBe(0.006);

    const createArgs = prisma.aIModelConfig.create.mock.calls[0][0];
    expect(createArgs.data.parametersJson).toEqual({
      temperature: 0.2,
    });
    expect(createArgs.data.inputTokenPriceUsd).toEqual(new Prisma.Decimal(0.0015));
    expect(createArgs.data.outputTokenPriceUsd).toEqual(new Prisma.Decimal(0.006));

    const result = await service.updateModel('ai_owner', 'model-classifier', {
      providerConfigId: backupProvider.id,
      displayName: 'Gemini classify',
      enabled: false,
      parametersJson: {
        temperature: 0.1,
        topK: 20,
      },
    });

    expect(result.provider.id).toBe(backupProvider.id);
    expect(result.enabled).toBe(false);
    expect(result.isDefault).toBe(false);
    expect(result.parametersJson).toEqual({
      temperature: 0.1,
      topK: 20,
    });

    const updateArgs = prisma.aIModelConfig.update.mock.calls[0][0];
    expect(updateArgs.data.provider).toEqual({
      connect: {
        id: backupProvider.id,
      },
    });
    expect(updateArgs.data.parametersJson).toEqual({
      temperature: 0.1,
      topK: 20,
    });

    await expect(
      service.listModels('ai_owner', {
        includeDisabled: true,
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'model-classifier',
        providerConfigId: backupProvider.id,
      }),
    ]);

    await expect(
      service.createModel('ai_owner', {
        providerConfigId: otherProvider.id,
        modelCode: 'claude-3-7-sonnet',
        displayName: 'Other owner model',
        taskType: AITaskType.REPORT_SUMMARY,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps a single default model per task type and falls back when the default is disabled', async () => {
    const provider = createProviderRecord(credentialCryptoService, {
      id: 'provider-openai',
    });
    const primaryModel = {
      ...createModelRecord({
        id: 'model-primary',
        providerConfigId: provider.id,
        modelCode: 'gpt-5.2',
        displayName: 'Primary Classifier',
        isDefault: false,
      }),
      provider,
    };
    const secondaryModel = {
      ...createModelRecord({
        id: 'model-secondary',
        providerConfigId: provider.id,
        modelCode: 'gpt-4.1-mini',
        displayName: 'Secondary Classifier',
        createdAt: new Date('2026-03-21T00:10:00.000Z'),
        updatedAt: new Date('2026-03-21T00:10:00.000Z'),
        isDefault: false,
      }),
      provider,
    };

    prisma.aIProviderConfig.findFirst.mockResolvedValue(provider);
    prisma.aIModelConfig.create.mockResolvedValue(primaryModel);
    prisma.aIModelConfig.findMany
      .mockResolvedValueOnce([
        {
          id: primaryModel.id,
          isDefault: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: primaryModel.id,
          isDefault: true,
        },
        {
          id: secondaryModel.id,
          isDefault: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: secondaryModel.id,
          isDefault: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: secondaryModel.id,
          isDefault: false,
        },
      ]);
    prisma.aIModelConfig.findFirst
      .mockResolvedValueOnce({
        ...secondaryModel,
        isDefault: false,
      })
      .mockResolvedValueOnce({
        ...primaryModel,
        isDefault: true,
      });
    prisma.aIModelConfig.findUniqueOrThrow
      .mockResolvedValueOnce({
        ...primaryModel,
        isDefault: true,
      })
      .mockResolvedValueOnce({
        ...secondaryModel,
        isDefault: true,
      })
      .mockResolvedValueOnce({
        ...primaryModel,
        enabled: false,
        isDefault: false,
      });
    prisma.aIModelConfig.update.mockResolvedValueOnce({
      ...secondaryModel,
      isDefault: true,
    });
    prisma.aIModelConfig.update.mockResolvedValueOnce({
      ...primaryModel,
      enabled: false,
      isDefault: false,
    });
    prisma.aIModelConfig.updateMany.mockResolvedValue({
      count: 1,
    });

    const created = await service.createModel('ai_owner', {
      providerConfigId: provider.id,
      modelCode: primaryModel.modelCode,
      displayName: primaryModel.displayName,
      taskType: primaryModel.taskType,
      enabled: true,
    });
    expect(created.isDefault).toBe(true);

    const switched = await service.updateModel('ai_owner', secondaryModel.id, {
      isDefault: true,
    });
    expect(switched.isDefault).toBe(true);

    const disabled = await service.updateModel('ai_owner', primaryModel.id, {
      enabled: false,
    });
    expect(disabled.isDefault).toBe(false);

    expect(prisma.aIModelConfig.updateMany).toHaveBeenCalledWith({
      where: {
        taskType: AITaskType.POST_CLASSIFY,
        isDefault: true,
        provider: {
          userId: 'ai_owner',
        },
        id: {
          not: secondaryModel.id,
        },
      },
      data: {
        isDefault: false,
      },
    });
    expect(prisma.aIModelConfig.updateMany).toHaveBeenCalledWith({
      where: {
        id: secondaryModel.id,
        isDefault: false,
      },
      data: {
        isDefault: true,
      },
    });
  });
});
