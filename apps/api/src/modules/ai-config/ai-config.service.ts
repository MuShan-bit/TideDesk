import {
  AIProviderConfig,
  AIProviderType,
  AIModelConfig,
  Prisma,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import { ListAiModelsQueryDto } from './dto/list-ai-models-query.dto';
import { ListAiProvidersQueryDto } from './dto/list-ai-providers-query.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto';

type ProviderListOptions = Pick<
  ListAiProvidersQueryDto,
  'includeDisabled' | 'keyword' | 'providerType'
>;

type ModelListOptions = Pick<
  ListAiModelsQueryDto,
  'includeDisabled' | 'keyword' | 'providerConfigId' | 'taskType'
>;

type ProviderWithModels = AIProviderConfig & {
  models?: AIModelConfig[];
};

type ModelWithProvider = AIModelConfig & {
  provider: AIProviderConfig;
};

@Injectable()
export class AiConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialCryptoService: CredentialCryptoService,
  ) {}

  async listProviders(userId: string, options: ProviderListOptions = {}) {
    const providers = await this.prisma.aIProviderConfig.findMany({
      where: this.buildProviderWhere(userId, options),
      include: {
        models: {
          where: options.includeDisabled ? {} : { enabled: true },
          orderBy: [{ taskType: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return providers.map((provider) => this.serializeProvider(provider));
  }

  async createProvider(userId: string, dto: CreateAiProviderDto) {
    this.assertProviderRequirements(dto.providerType, dto.baseUrl ?? null);

    const provider = await this.prisma.aIProviderConfig.create({
      data: {
        userId,
        providerType: dto.providerType,
        name: dto.name,
        baseUrl: dto.baseUrl ?? null,
        apiKeyEncrypted: this.credentialCryptoService.encrypt(dto.apiKey),
        enabled: dto.enabled ?? true,
      },
      include: {
        models: {
          orderBy: [{ taskType: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return this.serializeProvider(provider);
  }

  async updateProvider(
    userId: string,
    providerConfigId: string,
    dto: UpdateAiProviderDto,
  ) {
    const provider = await this.findProviderOrThrow(userId, providerConfigId);
    const effectiveProviderType = dto.providerType ?? provider.providerType;
    const effectiveBaseUrl =
      dto.baseUrl !== undefined ? dto.baseUrl ?? null : provider.baseUrl;

    this.assertProviderRequirements(effectiveProviderType, effectiveBaseUrl);

    const data: Prisma.AIProviderConfigUpdateInput = {};

    if (dto.providerType !== undefined) {
      data.providerType = dto.providerType;
    }

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.baseUrl !== undefined) {
      data.baseUrl = dto.baseUrl ?? null;
    }

    if (dto.enabled !== undefined) {
      data.enabled = dto.enabled;
    }

    if (dto.apiKey !== undefined) {
      data.apiKeyEncrypted = this.credentialCryptoService.encrypt(dto.apiKey);
    }

    const updatedProvider =
      Object.keys(data).length > 0
        ? await this.prisma.aIProviderConfig.update({
            where: { id: provider.id },
            data,
            include: {
              models: {
                orderBy: [{ taskType: 'asc' }, { createdAt: 'asc' }],
              },
            },
          })
        : await this.prisma.aIProviderConfig.findUniqueOrThrow({
            where: { id: provider.id },
            include: {
              models: {
                orderBy: [{ taskType: 'asc' }, { createdAt: 'asc' }],
              },
            },
          });

    return this.serializeProvider(updatedProvider);
  }

  async listModels(userId: string, options: ModelListOptions = {}) {
    const models = await this.prisma.aIModelConfig.findMany({
      where: this.buildModelWhere(userId, options),
      include: {
        provider: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return models.map((model) => this.serializeModel(model));
  }

  async createModel(userId: string, dto: CreateAiModelDto) {
    await this.findProviderOrThrow(userId, dto.providerConfigId);

    const model = await this.prisma.aIModelConfig.create({
      data: {
        providerConfigId: dto.providerConfigId,
        modelCode: dto.modelCode,
        displayName: dto.displayName,
        taskType: dto.taskType,
        enabled: dto.enabled ?? true,
        parametersJson: this.toParametersJsonInput(dto.parametersJson),
      },
      include: {
        provider: true,
      },
    });

    return this.serializeModel(model);
  }

  async updateModel(userId: string, modelConfigId: string, dto: UpdateAiModelDto) {
    const model = await this.findModelOrThrow(userId, modelConfigId);
    const targetProviderId = dto.providerConfigId ?? model.providerConfigId;

    if (targetProviderId !== model.providerConfigId) {
      await this.findProviderOrThrow(userId, targetProviderId);
    }

    const data: Prisma.AIModelConfigUpdateInput = {};

    if (dto.providerConfigId !== undefined) {
      data.provider = {
        connect: {
          id: dto.providerConfigId,
        },
      };
    }

    if (dto.modelCode !== undefined) {
      data.modelCode = dto.modelCode;
    }

    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName;
    }

    if (dto.taskType !== undefined) {
      data.taskType = dto.taskType;
    }

    if (dto.enabled !== undefined) {
      data.enabled = dto.enabled;
    }

    if (dto.parametersJson !== undefined) {
      data.parametersJson = this.toParametersJsonInput(dto.parametersJson);
    }

    const updatedModel =
      Object.keys(data).length > 0
        ? await this.prisma.aIModelConfig.update({
            where: { id: model.id },
            data,
            include: {
              provider: true,
            },
          })
        : await this.prisma.aIModelConfig.findUniqueOrThrow({
            where: { id: model.id },
            include: {
              provider: true,
            },
          });

    return this.serializeModel(updatedModel);
  }

  private buildProviderWhere(
    userId: string,
    options: ProviderListOptions,
  ): Prisma.AIProviderConfigWhereInput {
    return {
      userId,
      ...(options.includeDisabled ? {} : { enabled: true }),
      ...(options.providerType ? { providerType: options.providerType } : {}),
      ...(options.keyword
        ? {
            OR: [
              {
                name: {
                  contains: options.keyword,
                  mode: 'insensitive',
                },
              },
              {
                baseUrl: {
                  contains: options.keyword,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
  }

  private buildModelWhere(
    userId: string,
    options: ModelListOptions,
  ): Prisma.AIModelConfigWhereInput {
    return {
      provider: {
        userId,
        ...(options.providerConfigId ? { id: options.providerConfigId } : {}),
      },
      ...(options.includeDisabled ? {} : { enabled: true }),
      ...(options.taskType ? { taskType: options.taskType } : {}),
      ...(options.keyword
        ? {
            OR: [
              {
                modelCode: {
                  contains: options.keyword,
                  mode: 'insensitive',
                },
              },
              {
                displayName: {
                  contains: options.keyword,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
  }

  private async findProviderOrThrow(userId: string, providerConfigId: string) {
    const provider = await this.prisma.aIProviderConfig.findFirst({
      where: {
        id: providerConfigId,
        userId,
      },
    });

    if (!provider) {
      throw new NotFoundException('AI provider config not found');
    }

    return provider;
  }

  private async findModelOrThrow(userId: string, modelConfigId: string) {
    const model = await this.prisma.aIModelConfig.findFirst({
      where: {
        id: modelConfigId,
        provider: {
          userId,
        },
      },
      include: {
        provider: true,
      },
    });

    if (!model) {
      throw new NotFoundException('AI model config not found');
    }

    return model;
  }

  private assertProviderRequirements(
    providerType: AIProviderType,
    baseUrl: string | null,
  ) {
    if (providerType === AIProviderType.OPENAI_COMPATIBLE && !baseUrl) {
      throw new BadRequestException(
        'OpenAI compatible providers require a baseUrl',
      );
    }
  }

  private toParametersJsonInput(
    value: Record<string, unknown> | null | undefined,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }

  private serializeProvider(provider: ProviderWithModels) {
    return {
      id: provider.id,
      providerType: provider.providerType,
      name: provider.name,
      baseUrl: provider.baseUrl,
      enabled: provider.enabled,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      hasApiKey: Boolean(provider.apiKeyEncrypted),
      models: (provider.models ?? []).map((model) =>
        this.serializeModelSummary(model),
      ),
    };
  }

  private serializeProviderSummary(provider: AIProviderConfig) {
    return {
      id: provider.id,
      providerType: provider.providerType,
      name: provider.name,
      baseUrl: provider.baseUrl,
      enabled: provider.enabled,
      hasApiKey: Boolean(provider.apiKeyEncrypted),
    };
  }

  private serializeModel(model: ModelWithProvider) {
    return {
      id: model.id,
      providerConfigId: model.providerConfigId,
      modelCode: model.modelCode,
      displayName: model.displayName,
      taskType: model.taskType,
      enabled: model.enabled,
      parametersJson: model.parametersJson,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      provider: this.serializeProviderSummary(model.provider),
    };
  }

  private serializeModelSummary(model: AIModelConfig) {
    return {
      id: model.id,
      providerConfigId: model.providerConfigId,
      modelCode: model.modelCode,
      displayName: model.displayName,
      taskType: model.taskType,
      enabled: model.enabled,
      parametersJson: model.parametersJson,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
