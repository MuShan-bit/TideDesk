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

type PrismaTransactionClient = Prisma.TransactionClient;

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
          orderBy: [
            { taskType: 'asc' },
            { isDefault: 'desc' },
            { createdAt: 'asc' },
          ],
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
          orderBy: [
            { taskType: 'asc' },
            { isDefault: 'desc' },
            { createdAt: 'asc' },
          ],
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
      dto.baseUrl !== undefined ? (dto.baseUrl ?? null) : provider.baseUrl;

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
        ? await this.prisma.$transaction(async (tx) => {
            const updated = await tx.aIProviderConfig.update({
              where: { id: provider.id },
              data,
              include: {
                models: {
                  orderBy: [
                    { taskType: 'asc' },
                    { isDefault: 'desc' },
                    { createdAt: 'asc' },
                  ],
                },
              },
            });

            if (dto.enabled !== undefined) {
              const taskTypes = await this.listProviderTaskTypes(
                tx,
                provider.id,
              );

              for (const taskType of taskTypes) {
                await this.syncDefaultModel(tx, userId, taskType);
              }
            }

            return updated;
          })
        : await this.prisma.aIProviderConfig.findUniqueOrThrow({
            where: { id: provider.id },
            include: {
              models: {
                orderBy: [
                  { taskType: 'asc' },
                  { isDefault: 'desc' },
                  { createdAt: 'asc' },
                ],
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
      orderBy: [
        { taskType: 'asc' },
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return models.map((model) => this.serializeModel(model));
  }

  async createModel(userId: string, dto: CreateAiModelDto) {
    await this.findProviderOrThrow(userId, dto.providerConfigId);
    this.assertDefaultModelEnabled(dto.isDefault, dto.enabled ?? true);

    const model = await this.prisma.$transaction(async (tx) => {
      const created = await tx.aIModelConfig.create({
        data: {
          providerConfigId: dto.providerConfigId,
          modelCode: dto.modelCode,
          displayName: dto.displayName,
          taskType: dto.taskType,
          isDefault: dto.isDefault ?? false,
          enabled: dto.enabled ?? true,
          parametersJson: this.toParametersJsonInput(dto.parametersJson),
          inputTokenPriceUsd: this.toOptionalDecimalInput(dto.inputTokenPriceUsd),
          outputTokenPriceUsd: this.toOptionalDecimalInput(
            dto.outputTokenPriceUsd,
          ),
        },
        include: {
          provider: true,
        },
      });

      await this.syncDefaultModel(
        tx,
        userId,
        dto.taskType,
        created.enabled && dto.isDefault === true ? created.id : undefined,
      );

      return tx.aIModelConfig.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          provider: true,
        },
      });
    });

    return this.serializeModel(model);
  }

  async updateModel(
    userId: string,
    modelConfigId: string,
    dto: UpdateAiModelDto,
  ) {
    const model = await this.findModelOrThrow(userId, modelConfigId);
    const targetProviderId = dto.providerConfigId ?? model.providerConfigId;
    const targetTaskType = dto.taskType ?? model.taskType;
    const targetEnabled = dto.enabled ?? model.enabled;

    if (targetProviderId !== model.providerConfigId) {
      await this.findProviderOrThrow(userId, targetProviderId);
    }

    this.assertDefaultModelEnabled(dto.isDefault, targetEnabled);

    const updatedModel = await this.prisma.$transaction(async (tx) => {
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

      if (dto.isDefault !== undefined) {
        data.isDefault = dto.isDefault;
      } else if (!targetEnabled || model.taskType !== targetTaskType) {
        data.isDefault = false;
      }

      if (dto.parametersJson !== undefined) {
        data.parametersJson = this.toParametersJsonInput(dto.parametersJson);
      }

      if (dto.inputTokenPriceUsd !== undefined) {
        data.inputTokenPriceUsd = this.toOptionalDecimalInput(
          dto.inputTokenPriceUsd,
        );
      }

      if (dto.outputTokenPriceUsd !== undefined) {
        data.outputTokenPriceUsd = this.toOptionalDecimalInput(
          dto.outputTokenPriceUsd,
        );
      }

      const updated =
        Object.keys(data).length > 0
          ? await tx.aIModelConfig.update({
              where: { id: model.id },
              data,
              include: {
                provider: true,
              },
            })
          : await tx.aIModelConfig.findUniqueOrThrow({
              where: { id: model.id },
              include: {
                provider: true,
              },
            });

      const affectedTaskTypes = new Set([model.taskType, targetTaskType]);

      for (const taskType of affectedTaskTypes) {
        await this.syncDefaultModel(
          tx,
          userId,
          taskType,
          taskType === targetTaskType && updated.enabled && updated.isDefault
            ? updated.id
            : undefined,
        );
      }

      return tx.aIModelConfig.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          provider: true,
        },
      });
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

  private assertDefaultModelEnabled(
    isDefault: boolean | undefined,
    enabled: boolean,
  ) {
    if (isDefault && !enabled) {
      throw new BadRequestException('Default AI models must remain enabled');
    }
  }

  private async listProviderTaskTypes(
    tx: PrismaTransactionClient,
    providerConfigId: string,
  ) {
    const models = await tx.aIModelConfig.findMany({
      where: {
        providerConfigId,
      },
      select: {
        taskType: true,
      },
      distinct: ['taskType'],
    });

    return models.map((model) => model.taskType);
  }

  private async syncDefaultModel(
    tx: PrismaTransactionClient,
    userId: string,
    taskType: AIModelConfig['taskType'],
    preferredModelId?: string,
  ) {
    const enabledModels = await tx.aIModelConfig.findMany({
      where: {
        taskType,
        enabled: true,
        provider: {
          userId,
          enabled: true,
        },
      },
      select: {
        id: true,
        isDefault: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const chosenModelId =
      preferredModelId &&
      enabledModels.some((model) => model.id === preferredModelId)
        ? preferredModelId
        : (enabledModels.find((item) => item.isDefault)?.id ??
          enabledModels[0]?.id);

    await tx.aIModelConfig.updateMany({
      where: {
        taskType,
        isDefault: true,
        provider: {
          userId,
        },
        ...(chosenModelId
          ? {
              id: {
                not: chosenModelId,
              },
            }
          : {}),
      },
      data: {
        isDefault: false,
      },
    });

    if (!chosenModelId) {
      return;
    }

    await tx.aIModelConfig.updateMany({
      where: {
        id: chosenModelId,
        isDefault: false,
      },
      data: {
        isDefault: true,
      },
    });
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

  private toOptionalDecimalInput(
    value: number | null | undefined,
  ): Prisma.Decimal | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    return new Prisma.Decimal(value);
  }

  private serializeDecimal(value: Prisma.Decimal | null | undefined) {
    if (!value) {
      return null;
    }

    return value.toNumber();
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
      isDefault: model.isDefault,
      enabled: model.enabled,
      parametersJson: model.parametersJson,
      inputTokenPriceUsd: this.serializeDecimal(model.inputTokenPriceUsd),
      outputTokenPriceUsd: this.serializeDecimal(model.outputTokenPriceUsd),
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
      isDefault: model.isDefault,
      enabled: model.enabled,
      parametersJson: model.parametersJson,
      inputTokenPriceUsd: this.serializeDecimal(model.inputTokenPriceUsd),
      outputTokenPriceUsd: this.serializeDecimal(model.outputTokenPriceUsd),
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
