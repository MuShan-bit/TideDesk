import {
  BindingStatus,
  CrawlMode,
  CrawlRunStatus,
  CredentialSource,
  type Prisma,
} from '@prisma/client';
import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CRAWL_RUN_DISPATCHER } from '../crawl-jobs/crawl-run-dispatcher.constants';
import type { CrawlRunDispatcher } from '../crawl-jobs/crawl-run-dispatcher.types';
import { CrawlJobsService } from '../crawl-jobs/crawl-jobs.service';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { FEED_CRAWLER_ADAPTER } from '../crawler/crawler.constants';
import type { FeedCrawlerAdapter } from '../crawler/crawler.types';
import { CrawlerAuthError } from '../crawler/errors/crawler-adapter.error';
import type { RealBrowserCredentialPayload } from '../crawler/x-browser.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCrawlProfileDto } from './dto/create-crawl-profile.dto';
import { UpsertBindingDto } from './dto/upsert-binding.dto';
import { UpdateCrawlProfileDto } from './dto/update-crawl-profile.dto';
import { UpdateCrawlConfigDto } from './dto/update-crawl-config.dto';

type BindingRecordWithJob = Prisma.XAccountBindingGetPayload<{
  include: {
    crawlJob: true;
    crawlProfiles: true;
  };
}>;

type PersistBindingInput = {
  avatarUrl?: string;
  crawlEnabled: boolean;
  crawlIntervalMinutes: number;
  credentialPayload: string;
  credentialSource: CredentialSource;
  displayName?: string;
  xUserId: string;
  username: string;
};

type ActiveCrawlRunSummary = {
  id: string;
  status: CrawlRunStatus;
};

const bindingDetailArgs = {
  include: {
    crawlJob: true,
    crawlProfiles: {
      orderBy: [
        {
          mode: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    },
  },
} satisfies Prisma.XAccountBindingDefaultArgs;

@Injectable()
export class BindingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crawlJobsService: CrawlJobsService,
    @Inject(CRAWL_RUN_DISPATCHER)
    private readonly crawlRunDispatcher: CrawlRunDispatcher,
    private readonly credentialCryptoService: CredentialCryptoService,
    @Inject(FEED_CRAWLER_ADAPTER)
    private readonly feedCrawlerAdapter: FeedCrawlerAdapter,
  ) {}

  async listForUser(userId: string) {
    return this.prisma.xAccountBinding.findMany({
      where: { userId },
      ...bindingDetailArgs,
      orderBy: [
        {
          updatedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async getCurrent(userId: string) {
    return this.findLatestBinding(userId);
  }

  async upsertForUser(userId: string, dto: UpsertBindingDto) {
    const existingBinding = await this.findBindingForUserAccount(userId, {
      xUserId: dto.xUserId,
      username: dto.username,
    });

    return this.persistBinding(
      userId,
      {
        xUserId: dto.xUserId,
        username: dto.username,
        displayName: dto.displayName,
        avatarUrl: dto.avatarUrl,
        credentialSource: dto.credentialSource ?? CredentialSource.WEB_LOGIN,
        credentialPayload: dto.credentialPayload,
        crawlEnabled: dto.crawlEnabled,
        crawlIntervalMinutes: dto.crawlIntervalMinutes,
      },
      existingBinding,
    );
  }

  async upsertFromBrowserLogin(
    userId: string,
    payload: RealBrowserCredentialPayload,
  ) {
    const existingBinding = await this.findBindingForUserAccount(userId, {
      xUserId: payload.xUserId,
      username: payload.username,
    });
    const normalizedPayload = {
      ...payload,
      xUserId: payload.xUserId ?? existingBinding?.xUserId ?? payload.username,
      username: payload.username ?? existingBinding?.username,
      displayName:
        payload.displayName ?? existingBinding?.displayName ?? undefined,
      avatarUrl: payload.avatarUrl ?? existingBinding?.avatarUrl ?? undefined,
    } satisfies RealBrowserCredentialPayload;

    if (!normalizedPayload.username || !normalizedPayload.xUserId) {
      throw new InternalServerErrorException(
        'Unable to resolve X account identity from browser login payload',
      );
    }

    const crawlEnabled =
      existingBinding?.status === BindingStatus.DISABLED
        ? true
        : (existingBinding?.crawlEnabled ?? true);
    const crawlIntervalMinutes = existingBinding?.crawlIntervalMinutes ?? 60;

    return this.persistBinding(
      userId,
      {
        xUserId: normalizedPayload.xUserId,
        username: normalizedPayload.username,
        displayName: normalizedPayload.displayName,
        avatarUrl: normalizedPayload.avatarUrl,
        credentialSource: CredentialSource.WEB_LOGIN,
        credentialPayload: JSON.stringify(normalizedPayload),
        crawlEnabled,
        crawlIntervalMinutes,
      },
      existingBinding,
    );
  }

  async updateCrawlConfig(
    userId: string,
    bindingId: string,
    dto: UpdateCrawlConfigDto,
  ) {
    const binding = await this.assertOwnership(userId, bindingId);
    const nextRunAt = dto.crawlEnabled
      ? this.buildNextRunAt(dto.crawlIntervalMinutes)
      : null;

    const updated = await this.prisma.xAccountBinding.update({
      where: { id: binding.id },
      data: {
        crawlEnabled: dto.crawlEnabled,
        crawlIntervalMinutes: dto.crawlIntervalMinutes,
        nextCrawlAt: nextRunAt,
        crawlJob: {
          upsert: {
            create: {
              enabled: dto.crawlEnabled,
              intervalMinutes: dto.crawlIntervalMinutes,
              nextRunAt,
            },
            update: {
              enabled: dto.crawlEnabled,
              intervalMinutes: dto.crawlIntervalMinutes,
              nextRunAt,
            },
          },
        },
      },
      ...bindingDetailArgs,
    });

    await this.syncDefaultCrawlProfile(updated.id, {
      enabled: dto.crawlEnabled,
      intervalMinutes: dto.crawlIntervalMinutes,
      nextRunAt,
    });

    return this.findBindingDetailOrThrow(updated.id);
  }

  async disable(userId: string, bindingId: string) {
    const binding = await this.assertOwnership(userId, bindingId);

    const disabled = await this.prisma.xAccountBinding.update({
      where: { id: binding.id },
      data: {
        status: BindingStatus.DISABLED,
        crawlEnabled: false,
        nextCrawlAt: null,
        crawlJob: {
          update: {
            enabled: false,
            nextRunAt: null,
          },
        },
        crawlProfiles: {
          updateMany: {
            where: {},
            data: {
              enabled: false,
              nextRunAt: null,
            },
          },
        },
      },
      ...bindingDetailArgs,
    });

    return disabled;
  }

  async unbind(userId: string, bindingId: string) {
    const binding = await this.assertOwnership(userId, bindingId);
    const activeRunCount = await this.prisma.crawlRun.count({
      where: {
        bindingId: binding.id,
        status: {
          in: [CrawlRunStatus.QUEUED, CrawlRunStatus.RUNNING],
        },
      },
    });

    if (activeRunCount > 0) {
      throw new ConflictException(
        'Current binding has queued or running crawl runs and cannot be unbound yet',
      );
    }

    const [deletedArchiveCount, deletedRunCount] =
      await this.prisma.$transaction(async (tx) => {
        const archivedPostCount = await tx.archivedPost.count({
          where: {
            bindingId: binding.id,
          },
        });
        const crawlRunCount = await tx.crawlRun.count({
          where: {
            bindingId: binding.id,
          },
        });

        await tx.xAccountBinding.delete({
          where: {
            id: binding.id,
          },
        });

        return [archivedPostCount, crawlRunCount];
      });

    return {
      deletedArchiveCount,
      deletedBindingId: binding.id,
      deletedRunCount,
    };
  }

  async revalidate(userId: string, bindingId: string) {
    const binding = await this.assertOwnership(userId, bindingId);
    const credentialPayload = this.credentialCryptoService.decrypt(
      binding.authPayloadEncrypted,
    );

    try {
      const profile =
        await this.feedCrawlerAdapter.validateCredential(credentialPayload);

      return this.prisma.xAccountBinding.update({
        where: { id: binding.id },
        data: {
          xUserId: profile.xUserId ?? binding.xUserId,
          username: profile.username ?? binding.username,
          displayName: profile.displayName ?? binding.displayName,
          avatarUrl: profile.avatarUrl ?? binding.avatarUrl,
          status: BindingStatus.ACTIVE,
          lastValidatedAt: new Date(),
          lastErrorMessage: null,
        },
        include: { crawlJob: true },
      });
    } catch (error) {
      const shouldInvalidate = error instanceof CrawlerAuthError;
      const message =
        error instanceof Error ? error.message : 'Unknown validation error';

      return this.prisma.xAccountBinding.update({
        where: { id: binding.id },
        data: {
          status: shouldInvalidate ? BindingStatus.INVALID : binding.status,
          lastValidatedAt: new Date(),
          lastErrorMessage: message,
        },
        include: { crawlJob: true },
      });
    }
  }

  async triggerManualCrawl(userId: string, bindingId: string) {
    const binding = await this.prisma.xAccountBinding.findFirst({
      where: {
        id: bindingId,
        userId,
      },
      include: {
        crawlJob: true,
        crawlProfiles: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!binding) {
      throw new NotFoundException('Binding not found');
    }

    if (binding.status !== BindingStatus.ACTIVE) {
      throw new ConflictException(
        'Only active bindings can trigger a manual crawl run',
      );
    }

    if (
      !binding.crawlProfiles.some((profile) => profile.mode === CrawlMode.RECOMMENDED)
    ) {
      throw new ConflictException(
        'Binding is missing crawl profile configuration and cannot be triggered',
      );
    }

    const runningRun = await this.findRunningCrawlRun(binding.id);

    if (runningRun) {
      throw new ConflictException(
        this.buildActiveRunConflictMessage(runningRun, 'running'),
      );
    }

    const queuedRun = await this.findQueuedCrawlRun(binding.id);

    if (queuedRun) {
      return this.crawlRunDispatcher.dispatchRun(queuedRun.id);
    }

    const [run] = await this.crawlJobsService.claimJobForBinding(binding.id);

    if (!run) {
      const blockingRun =
        (await this.findRunningCrawlRun(binding.id)) ??
        (await this.findQueuedCrawlRun(binding.id));

      if (blockingRun?.status === CrawlRunStatus.QUEUED) {
        return this.crawlRunDispatcher.dispatchRun(blockingRun.id);
      }

      throw new ConflictException(
        blockingRun
          ? this.buildActiveRunConflictMessage(blockingRun, 'running')
          : 'A crawl run is already queued or running for this binding',
      );
    }

    return this.crawlRunDispatcher.dispatchClaimedRun(run);
  }

  async listCrawlProfiles(userId: string, bindingId: string) {
    await this.assertOwnership(userId, bindingId);

    return this.prisma.crawlProfile.findMany({
      where: {
        bindingId,
      },
      orderBy: [
        {
          mode: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });
  }

  async createCrawlProfile(
    userId: string,
    bindingId: string,
    dto: CreateCrawlProfileDto,
  ) {
    await this.assertOwnership(userId, bindingId);

    return this.prisma.crawlProfile.create({
      data: {
        bindingId,
        mode: dto.mode,
        enabled: dto.enabled,
        intervalMinutes: dto.intervalMinutes,
        queryText: dto.queryText?.trim() || null,
        region: dto.region?.trim() || null,
        language: dto.language?.trim() || null,
        maxPosts: dto.maxPosts,
        nextRunAt: dto.enabled ? this.buildNextRunAt(dto.intervalMinutes) : null,
      },
    });
  }

  async updateCrawlProfile(
    userId: string,
    bindingId: string,
    profileId: string,
    dto: UpdateCrawlProfileDto,
  ) {
    await this.assertOwnership(userId, bindingId);
    await this.assertCrawlProfileOwnership(bindingId, profileId);

    return this.prisma.crawlProfile.update({
      where: {
        id: profileId,
      },
      data: {
        enabled: dto.enabled,
        intervalMinutes: dto.intervalMinutes,
        queryText: dto.queryText?.trim() || null,
        region: dto.region?.trim() || null,
        language: dto.language?.trim() || null,
        maxPosts: dto.maxPosts,
        nextRunAt: dto.enabled ? this.buildNextRunAt(dto.intervalMinutes) : null,
      },
    });
  }

  private findQueuedCrawlRun(bindingId: string) {
    return this.prisma.crawlRun.findFirst({
      where: {
        bindingId,
        status: CrawlRunStatus.QUEUED,
      },
      select: {
        id: true,
        status: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  private findRunningCrawlRun(bindingId: string) {
    return this.prisma.crawlRun.findFirst({
      where: {
        bindingId,
        status: CrawlRunStatus.RUNNING,
      },
      select: {
        id: true,
        status: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
  }

  private buildActiveRunConflictMessage(
    run: ActiveCrawlRunSummary,
    state: 'queued' | 'running',
  ) {
    return `A crawl run is already ${state} for this binding. Run ID: ${run.id}`;
  }

  private async persistBinding(
    userId: string,
    input: PersistBindingInput,
    existingBinding?: BindingRecordWithJob | null,
  ) {
    const encryptedPayload = this.credentialCryptoService.encrypt(
      input.credentialPayload,
    );
    const nextRunAt = input.crawlEnabled
      ? this.buildNextRunAt(input.crawlIntervalMinutes)
      : null;

    const data: Prisma.XAccountBindingUncheckedCreateInput = {
      userId,
      xUserId: input.xUserId,
      username: input.username,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      status: BindingStatus.ACTIVE,
      credentialSource: input.credentialSource,
      authPayloadEncrypted: encryptedPayload,
      lastValidatedAt: new Date(),
      crawlEnabled: input.crawlEnabled,
      crawlIntervalMinutes: input.crawlIntervalMinutes,
      nextCrawlAt: nextRunAt,
      lastErrorMessage: null,
    };

    if (!existingBinding) {
      return this.prisma.xAccountBinding.create({
        data: {
          ...data,
          crawlJob: {
            create: {
              enabled: input.crawlEnabled,
              intervalMinutes: input.crawlIntervalMinutes,
              nextRunAt,
            },
          },
          crawlProfiles: {
            create: [
              {
                mode: CrawlMode.RECOMMENDED,
                enabled: input.crawlEnabled,
                intervalMinutes: input.crawlIntervalMinutes,
                maxPosts: 20,
                nextRunAt,
              },
            ],
          },
        },
        ...bindingDetailArgs,
      });
    }

    const updated = await this.prisma.xAccountBinding.update({
      where: { id: existingBinding.id },
      data: {
        xUserId: data.xUserId,
        username: data.username,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        status: BindingStatus.ACTIVE,
        credentialSource: input.credentialSource,
        authPayloadEncrypted: encryptedPayload,
        lastValidatedAt: new Date(),
        crawlEnabled: input.crawlEnabled,
        crawlIntervalMinutes: input.crawlIntervalMinutes,
        nextCrawlAt: nextRunAt,
        lastErrorMessage: null,
        crawlJob: {
          upsert: {
            create: {
              enabled: input.crawlEnabled,
              intervalMinutes: input.crawlIntervalMinutes,
              nextRunAt,
            },
            update: {
              enabled: input.crawlEnabled,
              intervalMinutes: input.crawlIntervalMinutes,
              nextRunAt,
            },
          },
        },
      },
      ...bindingDetailArgs,
    });

    await this.syncDefaultCrawlProfile(updated.id, {
      enabled: input.crawlEnabled,
      intervalMinutes: input.crawlIntervalMinutes,
      nextRunAt,
    });

    return this.findBindingDetailOrThrow(updated.id);
  }

  private async assertOwnership(userId: string, bindingId: string) {
    const binding = await this.prisma.xAccountBinding.findFirst({
      where: {
        id: bindingId,
        userId,
      },
    });

    if (!binding) {
      throw new NotFoundException('Binding not found');
    }

    return binding;
  }

  private async assertCrawlProfileOwnership(bindingId: string, profileId: string) {
    const profile = await this.prisma.crawlProfile.findFirst({
      where: {
        id: profileId,
        bindingId,
      },
    });

    if (!profile) {
      throw new NotFoundException('Crawl profile not found');
    }

    return profile;
  }

  private async findBindingForUserAccount(
    userId: string,
    account: {
      xUserId?: string;
      username?: string;
    },
  ) {
    if (!account.xUserId && !account.username) {
      return null;
    }

    return this.prisma.xAccountBinding.findFirst({
      where: {
        userId,
        OR: [
          account.xUserId
            ? {
                xUserId: account.xUserId,
              }
            : undefined,
          account.username
            ? {
                username: account.username,
              }
            : undefined,
        ].filter(Boolean) as Prisma.XAccountBindingWhereInput[],
      },
      ...bindingDetailArgs,
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  private findLatestBinding(userId: string) {
    return this.prisma.xAccountBinding.findFirst({
      where: { userId },
      ...bindingDetailArgs,
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async findBindingDetailOrThrow(bindingId: string) {
    const binding = await this.prisma.xAccountBinding.findUnique({
      where: {
        id: bindingId,
      },
      ...bindingDetailArgs,
    });

    if (!binding) {
      throw new NotFoundException('Binding not found');
    }

    return binding;
  }

  private async syncDefaultCrawlProfile(
    bindingId: string,
    input: {
      enabled: boolean;
      intervalMinutes: number;
      nextRunAt: Date | null;
    },
  ) {
    const existingProfile = await this.prisma.crawlProfile.findFirst({
      where: {
        bindingId,
        mode: CrawlMode.RECOMMENDED,
        queryText: null,
        region: null,
        language: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!existingProfile) {
      await this.prisma.crawlProfile.create({
        data: {
          bindingId,
          mode: CrawlMode.RECOMMENDED,
          enabled: input.enabled,
          intervalMinutes: input.intervalMinutes,
          maxPosts: 20,
          nextRunAt: input.nextRunAt,
        },
      });

      return;
    }

    await this.prisma.crawlProfile.update({
      where: {
        id: existingProfile.id,
      },
      data: {
        enabled: input.enabled,
        intervalMinutes: input.intervalMinutes,
        nextRunAt: input.nextRunAt,
      },
    });
  }

  private buildNextRunAt(intervalMinutes: number) {
    const now = new Date();

    return new Date(now.getTime() + intervalMinutes * 60 * 1000);
  }
}
