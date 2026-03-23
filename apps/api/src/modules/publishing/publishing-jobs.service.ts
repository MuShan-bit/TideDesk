import {
  type Prisma,
  PublishBindingStatus,
  PublishJobStatus,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishingChannelAdapterRegistry } from './adapters/publishing-channel-adapter.registry';
import { resolvePublishDraftStatus } from './publish-draft-status';
import { ExecutePublishDraftDto } from './dto/execute-publish-draft.dto';

const draftExecutionInclude = {
  draftTags: {
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      tag: true,
    },
  },
  publishJobs: {
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      channelBinding: true,
    },
  },
  targetChannels: {
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      channelBinding: true,
    },
  },
} satisfies Prisma.PublishDraftInclude;

type PublishDraftExecutionRecord = Prisma.PublishDraftGetPayload<{
  include: typeof draftExecutionInclude;
}>;

@Injectable()
export class PublishingJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialCryptoService: CredentialCryptoService,
    private readonly publishingChannelAdapterRegistry:
      PublishingChannelAdapterRegistry,
  ) {}

  async publishDraft(
    userId: string,
    draftId: string,
    dto: ExecutePublishDraftDto = {},
  ) {
    const draft = await this.findDraftOrThrow(userId, draftId);
    const requestedChannelBindingId = dto.channelBindingId?.trim() || null;
    const latestJobsByChannel = this.buildLatestJobsMap(draft.publishJobs);
    const selectedChannels = draft.targetChannels.map((item) => item.channelBinding);

    if (selectedChannels.length === 0) {
      throw new BadRequestException(
        'Publish draft requires at least one selected target channel',
      );
    }

    const channelsToExecute = requestedChannelBindingId
      ? this.resolveRequestedChannel(
          selectedChannels,
          requestedChannelBindingId,
          latestJobsByChannel,
        )
      : selectedChannels.filter((channel) => {
          const latestJob = latestJobsByChannel.get(channel.id);

          return latestJob?.status !== PublishJobStatus.SUCCESS;
        });

    if (channelsToExecute.length === 0) {
      throw new BadRequestException(
        requestedChannelBindingId
          ? 'The selected publishing channel has already succeeded'
          : 'All selected publishing channels have already succeeded',
      );
    }

    const results = [];

    for (const channel of channelsToExecute) {
      const result = await this.executePublishJob(draft, channel);

      results.push(result);
    }

    await this.refreshDraftStatus(draft.id);

    return {
      draftId: draft.id,
      executedChannelCount: results.length,
      requestedChannelBindingId,
      results,
    };
  }

  private resolveRequestedChannel(
    channels: PublishDraftExecutionRecord['targetChannels'][number]['channelBinding'][],
    requestedChannelBindingId: string,
    latestJobsByChannel: Map<
      string,
      PublishDraftExecutionRecord['publishJobs'][number]
    >,
  ) {
    const requestedChannel = channels.find(
      (channel) => channel.id === requestedChannelBindingId,
    );

    if (!requestedChannel) {
      throw new BadRequestException(
        'The requested publishing channel is not selected on this draft',
      );
    }

    const latestJob = latestJobsByChannel.get(requestedChannel.id);

    if (latestJob?.status === PublishJobStatus.SUCCESS) {
      throw new BadRequestException(
        'The requested publishing channel has already succeeded',
      );
    }

    return [requestedChannel];
  }

  private async executePublishJob(
    draft: PublishDraftExecutionRecord,
    channelBinding: PublishDraftExecutionRecord['targetChannels'][number]['channelBinding'],
  ) {
    if (channelBinding.status !== PublishBindingStatus.ACTIVE) {
      return this.createFailedJob(draft.id, channelBinding.id, {
        errorMessage:
          channelBinding.lastValidationError ??
          'Publishing channel binding is not active',
      });
    }

    let credentialPayload: Record<string, unknown>;

    try {
      credentialPayload = this.parseCredentialPayload(
        this.credentialCryptoService.decrypt(channelBinding.authPayloadEncrypted),
      );
    } catch (error) {
      return this.createFailedJob(draft.id, channelBinding.id, {
        errorMessage:
          error instanceof Error
            ? `Unable to decrypt publishing credential payload: ${error.message}`
            : 'Unable to decrypt publishing credential payload',
      });
    }

    const adapter = this.publishingChannelAdapterRegistry.getAdapter(
      channelBinding.platformType,
    );
    const queuedJob = await this.prisma.publishJob.create({
      data: {
        draftId: draft.id,
        channelBindingId: channelBinding.id,
        status: PublishJobStatus.QUEUED,
      },
      include: {
        channelBinding: true,
      },
    });

    await this.prisma.publishJob.update({
      where: {
        id: queuedJob.id,
      },
      data: {
        status: PublishJobStatus.RUNNING,
        errorMessage: null,
        publishedAt: null,
        remotePostId: null,
        remotePostUrl: null,
      },
    });

    try {
      const publishResult = await adapter.publishDraft({
        binding: {
          id: channelBinding.id,
          platformType: channelBinding.platformType,
          displayName: channelBinding.displayName,
          accountIdentifier: channelBinding.accountIdentifier,
          status: channelBinding.status,
          credentialPayload,
        },
        draft: {
          id: draft.id,
          title: draft.title,
          summary: draft.summary,
          renderedHtml: draft.renderedHtml,
          richTextJson: draft.richTextJson,
          sourceType: draft.sourceType,
          status: draft.status,
          tags: draft.draftTags.map((item) => ({
            id: item.tag.id,
            name: item.tag.name,
            slug: item.tag.slug,
            color: item.tag.color,
          })),
        },
      });
      const finalizedResult = await this.trySyncPublishedResult(
        adapter,
        {
          id: channelBinding.id,
          platformType: channelBinding.platformType,
          displayName: channelBinding.displayName,
          accountIdentifier: channelBinding.accountIdentifier,
          status: channelBinding.status,
          credentialPayload,
        },
        queuedJob.id,
        publishResult,
      );

      return this.prisma.publishJob.update({
        where: {
          id: queuedJob.id,
        },
        data: {
          status: finalizedResult.status ?? PublishJobStatus.SUCCESS,
          remotePostId: finalizedResult.remotePostId,
          remotePostUrl: finalizedResult.remotePostUrl,
          errorMessage: null,
          publishedAt: finalizedResult.publishedAt ?? null,
        },
        include: {
          channelBinding: true,
        },
      });
    } catch (error) {
      return this.prisma.publishJob.update({
        where: {
          id: queuedJob.id,
        },
        data: {
          status: PublishJobStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : 'Publishing job failed',
          publishedAt: null,
        },
        include: {
          channelBinding: true,
        },
      });
    }
  }

  private async trySyncPublishedResult(
    adapter: ReturnType<PublishingChannelAdapterRegistry['getAdapter']>,
    binding: {
      accountIdentifier: string | null;
      credentialPayload: Record<string, unknown>;
      displayName: string;
      id: string;
      platformType: PublishDraftExecutionRecord['targetChannels'][number]['channelBinding']['platformType'];
      status: PublishBindingStatus;
    },
    publishJobId: string,
    publishResult: {
      metadataJson?: Record<string, unknown> | null;
      publishedAt?: Date | null;
      remotePostId: string | null;
      remotePostUrl: string | null;
      status?: PublishJobStatus;
    },
  ) {
    const shouldSync =
      publishResult.status === PublishJobStatus.RUNNING ||
      ((publishResult.remotePostId !== null || publishResult.remotePostUrl !== null) &&
        (!publishResult.publishedAt || !publishResult.remotePostUrl));

    if (!shouldSync) {
      return publishResult;
    }

    try {
      const syncResult = await adapter.syncPublishedMetadata({
        binding,
        publishJobId,
        remotePostId: publishResult.remotePostId,
        remotePostUrl: publishResult.remotePostUrl,
      });

      return {
        ...publishResult,
        remotePostId: syncResult.remotePostId ?? publishResult.remotePostId,
        remotePostUrl: syncResult.remotePostUrl ?? publishResult.remotePostUrl,
        publishedAt: syncResult.publishedAt ?? publishResult.publishedAt,
        status: syncResult.status ?? publishResult.status,
      };
    } catch {
      return publishResult;
    }
  }

  private async createFailedJob(
    draftId: string,
    channelBindingId: string,
    input: {
      errorMessage: string;
    },
  ) {
    const job = await this.prisma.publishJob.create({
      data: {
        draftId,
        channelBindingId,
        status: PublishJobStatus.FAILED,
        errorMessage: input.errorMessage,
      },
      include: {
        channelBinding: true,
      },
    });

    await this.refreshDraftStatus(draftId);

    return job;
  }

  private async refreshDraftStatus(draftId: string) {
    const [targetChannelCount, jobs] = await Promise.all([
      this.prisma.publishDraftTargetChannel.count({
        where: {
          draftId,
        },
      }),
      this.prisma.publishJob.findMany({
        where: {
          draftId,
        },
        select: {
          channelBindingId: true,
          status: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const nextStatus = resolvePublishDraftStatus({
      targetChannelCount,
      latestJobStatuses: this.extractLatestJobStatuses(jobs),
    });

    await this.prisma.publishDraft.update({
      where: {
        id: draftId,
      },
      data: {
        status: nextStatus,
      },
    });
  }

  private extractLatestJobStatuses(
    jobs: Array<{
      channelBindingId: string;
      status: PublishJobStatus;
    }>,
  ) {
    const statuses = new Map<string, PublishJobStatus>();

    for (const job of jobs) {
      if (!statuses.has(job.channelBindingId)) {
        statuses.set(job.channelBindingId, job.status);
      }
    }

    return Array.from(statuses.values());
  }

  private buildLatestJobsMap(
    jobs: PublishDraftExecutionRecord['publishJobs'],
  ) {
    const latestJobs = new Map<string, PublishDraftExecutionRecord['publishJobs'][number]>();

    for (const job of jobs) {
      if (!latestJobs.has(job.channelBindingId)) {
        latestJobs.set(job.channelBindingId, job);
      }
    }

    return latestJobs;
  }

  private async findDraftOrThrow(userId: string, draftId: string) {
    const draft = await this.prisma.publishDraft.findFirst({
      where: {
        id: draftId,
        userId,
      },
      include: draftExecutionInclude,
    });

    if (!draft) {
      throw new NotFoundException('Publish draft not found');
    }

    return draft;
  }

  private parseCredentialPayload(payload: string) {
    const parsedPayload = JSON.parse(payload) as unknown;

    if (
      !parsedPayload ||
      typeof parsedPayload !== 'object' ||
      Array.isArray(parsedPayload)
    ) {
      throw new Error('Publish credential payload must be a JSON object');
    }

    return parsedPayload as Record<string, unknown>;
  }
}
