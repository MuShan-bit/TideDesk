import {
  Prisma,
  PublishBindingStatus,
  PublishPlatformType,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublishChannelBindingDto } from './dto/create-publish-channel-binding.dto';
import { ListPublishChannelBindingsQueryDto } from './dto/list-publish-channel-bindings-query.dto';
import { UpdatePublishChannelBindingDto } from './dto/update-publish-channel-binding.dto';

type PublishCredentialPayload = Record<string, unknown>;

type ValidationResult = {
  inferredAccountIdentifier: string | null;
  normalizedPayload: PublishCredentialPayload;
  status: PublishBindingStatus;
  validationError: string | null;
};

const PLATFORM_VALIDATION_RULES = {
  WECHAT: {
    label: '微信公众号',
    identifierKeys: [
      'accountIdentifier',
      'biz',
      'appId',
      'accountId',
      'username',
    ],
    requiredAnyKeys: ['appId', 'biz', 'cookie', 'accessToken'],
  },
  ZHIHU: {
    label: '知乎',
    identifierKeys: [
      'accountIdentifier',
      'username',
      'account',
      'accountId',
      'handle',
    ],
    requiredAnyKeys: ['cookie', 'session', 'authorization', 'account'],
  },
  CSDN: {
    label: 'CSDN',
    identifierKeys: [
      'accountIdentifier',
      'username',
      'blog',
      'account',
      'userToken',
    ],
    requiredAnyKeys: ['cookie', 'userToken', 'csrfToken', 'account'],
  },
} satisfies Record<
  PublishPlatformType,
  {
    identifierKeys: string[];
    label: string;
    requiredAnyKeys: string[];
  }
>;

@Injectable()
export class PublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialCryptoService: CredentialCryptoService,
  ) {}

  listPublishChannelBindings(
    userId: string,
    query: ListPublishChannelBindingsQueryDto = {},
  ) {
    return this.prisma.publishChannelBinding.findMany({
      where: {
        userId,
        ...(query.platformType ? { platformType: query.platformType } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getPublishChannelBinding(userId: string, bindingId: string) {
    return this.findPublishChannelBindingOrThrow(userId, bindingId);
  }

  async createPublishChannelBinding(
    userId: string,
    dto: CreatePublishChannelBindingDto,
  ) {
    const validation = this.validateCredentialPayload(
      dto.platformType,
      dto.credentialPayload,
    );

    return this.prisma.publishChannelBinding.create({
      data: {
        userId,
        platformType: dto.platformType,
        displayName: dto.displayName.trim(),
        accountIdentifier: this.resolveAccountIdentifier(
          dto.accountIdentifier,
          validation.inferredAccountIdentifier,
        ),
        authPayloadEncrypted: this.credentialCryptoService.encrypt(
          JSON.stringify(validation.normalizedPayload),
        ),
        status: validation.status,
        lastValidatedAt: new Date(),
        lastValidationError: validation.validationError,
      },
    });
  }

  async updatePublishChannelBinding(
    userId: string,
    bindingId: string,
    dto: UpdatePublishChannelBindingDto,
  ) {
    const binding = await this.findPublishChannelBindingOrThrow(userId, bindingId);
    const data: Prisma.PublishChannelBindingUpdateInput = {};

    if (dto.displayName !== undefined) {
      const displayName = dto.displayName.trim();

      if (displayName.length === 0) {
        throw new BadRequestException('Publish channel display name is required');
      }

      data.displayName = displayName;
    }

    if (dto.accountIdentifier !== undefined) {
      data.accountIdentifier = this.normalizeOptionalString(dto.accountIdentifier);
    }

    if (dto.credentialPayload !== undefined) {
      const validation = this.validateCredentialPayload(
        binding.platformType,
        dto.credentialPayload,
      );

      data.authPayloadEncrypted = this.credentialCryptoService.encrypt(
        JSON.stringify(validation.normalizedPayload),
      );
      data.status = validation.status;
      data.lastValidatedAt = new Date();
      data.lastValidationError = validation.validationError;

      if (dto.accountIdentifier === undefined) {
        data.accountIdentifier =
          binding.accountIdentifier ??
          validation.inferredAccountIdentifier ??
          null;
      }
    }

    if (Object.keys(data).length === 0) {
      return binding;
    }

    return this.prisma.publishChannelBinding.update({
      where: { id: binding.id },
      data,
    });
  }

  async revalidatePublishChannelBinding(userId: string, bindingId: string) {
    const binding = await this.findPublishChannelBindingOrThrow(userId, bindingId);
    const validatedAt = new Date();

    try {
      const decryptedPayload = this.credentialCryptoService.decrypt(
        binding.authPayloadEncrypted,
      );
      const validation = this.validateCredentialPayload(
        binding.platformType,
        decryptedPayload,
      );

      return this.prisma.publishChannelBinding.update({
        where: { id: binding.id },
        data: {
          status: validation.status,
          accountIdentifier:
            binding.accountIdentifier ??
            validation.inferredAccountIdentifier ??
            null,
          lastValidatedAt: validatedAt,
          lastValidationError: validation.validationError,
        },
      });
    } catch (error) {
      return this.prisma.publishChannelBinding.update({
        where: { id: binding.id },
        data: {
          status: PublishBindingStatus.INVALID,
          lastValidatedAt: validatedAt,
          lastValidationError:
            error instanceof Error
              ? `Unable to decrypt or validate credential payload: ${error.message}`
              : 'Unable to decrypt or validate credential payload',
        },
      });
    }
  }

  async disablePublishChannelBinding(userId: string, bindingId: string) {
    const binding = await this.findPublishChannelBindingOrThrow(userId, bindingId);

    return this.prisma.publishChannelBinding.update({
      where: { id: binding.id },
      data: {
        status: PublishBindingStatus.DISABLED,
      },
    });
  }

  private async findPublishChannelBindingOrThrow(
    userId: string,
    bindingId: string,
  ) {
    const binding = await this.prisma.publishChannelBinding.findFirst({
      where: {
        id: bindingId,
        userId,
      },
    });

    if (!binding) {
      throw new NotFoundException('Publish channel binding not found');
    }

    return binding;
  }

  private validateCredentialPayload(
    platformType: PublishPlatformType,
    credentialPayload: string,
  ): ValidationResult {
    const normalizedPayload = this.parseCredentialPayload(credentialPayload);
    const rule = PLATFORM_VALIDATION_RULES[platformType];
    const matchedKey = rule.requiredAnyKeys.find((key) =>
      this.hasUsableValue(normalizedPayload[key]),
    );

    return {
      normalizedPayload,
      inferredAccountIdentifier: this.inferAccountIdentifier(
        normalizedPayload,
        rule.identifierKeys,
      ),
      status: matchedKey
        ? PublishBindingStatus.ACTIVE
        : PublishBindingStatus.INVALID,
      validationError: matchedKey
        ? null
        : `${rule.label}凭证缺少关键字段，请至少提供 ${rule.requiredAnyKeys.join(
            ' / ',
          )} 中的一项。`,
    };
  }

  private parseCredentialPayload(payload: string): PublishCredentialPayload {
    let parsed: unknown;

    try {
      parsed = JSON.parse(payload);
    } catch {
      throw new BadRequestException(
        'Publish channel credential payload must be valid JSON',
      );
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException(
        'Publish channel credential payload must be a JSON object',
      );
    }

    return parsed as PublishCredentialPayload;
  }

  private inferAccountIdentifier(
    payload: PublishCredentialPayload,
    keys: string[],
  ) {
    for (const key of keys) {
      const value = payload[key];

      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return null;
  }

  private hasUsableValue(value: unknown) {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return true;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (value && typeof value === 'object') {
      return Object.keys(value).length > 0;
    }

    return false;
  }

  private resolveAccountIdentifier(
    value: string | undefined,
    inferredValue: string | null,
  ) {
    return this.normalizeOptionalString(value) ?? inferredValue ?? null;
  }

  private normalizeOptionalString(value: string | undefined) {
    if (value === undefined) {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }
}
