import {
  PublishBindingStatus,
  PublishDraftSourceType,
  PublishDraftStatus,
  PublishJobStatus,
  PublishPlatformType,
} from '@prisma/client';

export const PUBLISHING_CHANNEL_ADAPTERS = Symbol(
  'PUBLISHING_CHANNEL_ADAPTERS',
);

export type PublishCredentialPayload = Record<string, unknown>;

export type PublishingCredentialValidationRequest = {
  credentialPayload: string;
};

export type PublishingCredentialValidationResult = {
  inferredAccountIdentifier: string | null;
  normalizedPayload: PublishCredentialPayload;
  status: PublishBindingStatus;
  validationError: string | null;
};

export type PublishingChannelBindingSnapshot = {
  accountIdentifier: string | null;
  credentialPayload: PublishCredentialPayload;
  displayName: string;
  id: string;
  platformType: PublishPlatformType;
  status: PublishBindingStatus;
};

export type PublishingDraftTagSnapshot = {
  color: string | null;
  id: string;
  name: string;
  slug: string;
};

export type PublishingDraftSnapshot = {
  id: string;
  renderedHtml: string | null;
  richTextJson: unknown;
  sourceType: PublishDraftSourceType;
  status: PublishDraftStatus;
  summary: string | null;
  tags: PublishingDraftTagSnapshot[];
  title: string;
};

export type PublishingDraftPublishRequest = {
  binding: PublishingChannelBindingSnapshot;
  draft: PublishingDraftSnapshot;
};

export type PublishingDraftPublishResult = {
  metadataJson?: Record<string, unknown> | null;
  publishedAt?: Date | null;
  remotePostId: string | null;
  remotePostUrl: string | null;
  status?: PublishJobStatus;
};

export type PublishingSyncPublishedMetadataRequest = {
  binding: PublishingChannelBindingSnapshot;
  publishJobId: string;
  remotePostId: string | null;
  remotePostUrl: string | null;
};

export type PublishingSyncPublishedMetadataResult = {
  metadataJson?: Record<string, unknown> | null;
  publishedAt?: Date | null;
  remotePostId?: string | null;
  remotePostUrl?: string | null;
  status?: PublishJobStatus;
};

export interface PublishingChannelAdapter {
  publishDraft(
    request: PublishingDraftPublishRequest,
  ): Promise<PublishingDraftPublishResult>;
  supports(platformType: PublishPlatformType): boolean;
  syncPublishedMetadata(
    request: PublishingSyncPublishedMetadataRequest,
  ): Promise<PublishingSyncPublishedMetadataResult>;
  validateCredential(
    request: PublishingCredentialValidationRequest,
  ): Promise<PublishingCredentialValidationResult>;
}
