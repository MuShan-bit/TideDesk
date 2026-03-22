import {
  PublishBindingStatus,
  PublishPlatformType,
} from '@prisma/client';
import { BadRequestException, NotImplementedException } from '@nestjs/common';
import type {
  PublishCredentialPayload,
  PublishingChannelAdapter,
  PublishingCredentialValidationRequest,
  PublishingCredentialValidationResult,
  PublishingDraftPublishRequest,
  PublishingDraftPublishResult,
  PublishingSyncPublishedMetadataRequest,
  PublishingSyncPublishedMetadataResult,
} from '../publishing-channel-adapter.types';

type PublishChannelValidationRule = {
  identifierKeys: string[];
  label: string;
  requiredAnyKeys: string[];
};

export abstract class BasePublishingChannelAdapter
  implements PublishingChannelAdapter
{
  protected abstract readonly validationRule: PublishChannelValidationRule;
  abstract readonly platformType: PublishPlatformType;

  supports(platformType: PublishPlatformType) {
    return platformType === this.platformType;
  }

  async validateCredential(
    request: PublishingCredentialValidationRequest,
  ): Promise<PublishingCredentialValidationResult> {
    const normalizedPayload = this.parseCredentialPayload(
      request.credentialPayload,
    );
    const matchedKey = this.validationRule.requiredAnyKeys.find((key) =>
      this.hasUsableValue(normalizedPayload[key]),
    );

    return {
      normalizedPayload,
      inferredAccountIdentifier: this.inferAccountIdentifier(
        normalizedPayload,
        this.validationRule.identifierKeys,
      ),
      status: matchedKey
        ? PublishBindingStatus.ACTIVE
        : PublishBindingStatus.INVALID,
      validationError: matchedKey
        ? null
        : `${this.validationRule.label}凭证缺少关键字段，请至少提供 ${this.validationRule.requiredAnyKeys.join(
            ' / ',
          )} 中的一项。`,
    };
  }

  async publishDraft(
    _request: PublishingDraftPublishRequest,
  ): Promise<PublishingDraftPublishResult> {
    throw new NotImplementedException(
      `${this.validationRule.label}发布适配器尚未实现发布能力`,
    );
  }

  async syncPublishedMetadata(
    _request: PublishingSyncPublishedMetadataRequest,
  ): Promise<PublishingSyncPublishedMetadataResult> {
    throw new NotImplementedException(
      `${this.validationRule.label}发布适配器尚未实现回执同步能力`,
    );
  }

  protected parseCredentialPayload(payload: string): PublishCredentialPayload {
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

  protected inferAccountIdentifier(
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

  protected hasUsableValue(value: unknown) {
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
}
