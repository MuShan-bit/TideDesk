import {
  Prisma,
  PublishBindingStatus,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishingChannelAdapterRegistry } from './adapters/publishing-channel-adapter.registry';
import { CreatePublishChannelBindingDto } from './dto/create-publish-channel-binding.dto';
import { ListPublishChannelBindingsQueryDto } from './dto/list-publish-channel-bindings-query.dto';
import { UpdatePublishChannelBindingDto } from './dto/update-publish-channel-binding.dto';

@Injectable()
export class PublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialCryptoService: CredentialCryptoService,
    private readonly publishingChannelAdapterRegistry:
      PublishingChannelAdapterRegistry,
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
    const adapter = this.publishingChannelAdapterRegistry.getAdapter(
      dto.platformType,
    );
    const validation = await adapter.validateCredential({
      credentialPayload: dto.credentialPayload,
    });

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
      const adapter = this.publishingChannelAdapterRegistry.getAdapter(
        binding.platformType,
      );
      const validation = await adapter.validateCredential({
        credentialPayload: dto.credentialPayload,
      });

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
      const adapter = this.publishingChannelAdapterRegistry.getAdapter(
        binding.platformType,
      );
      const validation = await adapter.validateCredential({
        credentialPayload: decryptedPayload,
      });

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
