import {
  type PublishDraftStatus,
  PublishJobStatus,
} from '@prisma/client';

type ResolvePublishDraftStatusInput = {
  latestJobStatuses?: PublishJobStatus[];
  targetChannelCount: number;
};

export function resolvePublishDraftStatus(
  input: ResolvePublishDraftStatusInput,
): PublishDraftStatus {
  if (input.targetChannelCount === 0) {
    return 'DRAFT';
  }

  const latestJobStatuses = input.latestJobStatuses ?? [];

  if (latestJobStatuses.length === 0) {
    return 'READY';
  }

  const successCount = latestJobStatuses.filter(
    (status) => status === PublishJobStatus.SUCCESS,
  ).length;
  const failedCount = latestJobStatuses.filter(
    (status) => status === PublishJobStatus.FAILED,
  ).length;

  if (successCount >= input.targetChannelCount) {
    return 'PUBLISHED_ALL';
  }

  if (successCount > 0) {
    return 'PUBLISHED_PARTIAL';
  }

  if (failedCount > 0 && failedCount === latestJobStatuses.length) {
    return 'FAILED';
  }

  return 'READY';
}
