import {
  BindingStatus,
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
import { CrawlExecutionService } from '../crawl-jobs/crawl-execution.service';
import { CrawlJobsService } from '../crawl-jobs/crawl-jobs.service';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { FEED_CRAWLER_ADAPTER } from '../crawler/crawler.constants';
import type { FeedCrawlerAdapter } from '../crawler/crawler.types';
import { CrawlerAuthError } from '../crawler/errors/crawler-adapter.error';
import type { RealBrowserCredentialPayload } from '../crawler/x-browser.types';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertBindingDto } from './dto/upsert-binding.dto';
import { UpdateCrawlConfigDto } from './dto/update-crawl-config.dto';

type BindingRecordWithJob = Prisma.XAccountBindingGetPayload<{
  include: {
    crawlJob: true;
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

@Injectable()
export class BindingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crawlJobsService: CrawlJobsService,
    private readonly crawlExecutionService: CrawlExecutionService,
    private readonly credentialCryptoService: CredentialCryptoService,
    @Inject(FEED_CRAWLER_ADAPTER)
    private readonly feedCrawlerAdapter: FeedCrawlerAdapter,
  ) {}

  async getCurrent(userId: string) {
    return this.findLatestBinding(userId);
  }

  async upsertForUser(userId: string, dto: UpsertBindingDto) {
    const existingBinding = await this.findLatestBinding(userId);

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
    const existingBinding = await this.findLatestBinding(userId);
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

    return this.prisma.xAccountBinding.update({
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
      include: { crawlJob: true },
    });
  }

  async disable(userId: string, bindingId: string) {
    const binding = await this.assertOwnership(userId, bindingId);

    return this.prisma.xAccountBinding.update({
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
      },
      include: { crawlJob: true },
    });
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

    if (!binding.crawlJob) {
      throw new ConflictException(
        'Binding is missing crawl job configuration and cannot be triggered',
      );
    }

    const [run] = await this.crawlJobsService.claimJobForBinding(binding.id);

    if (!run) {
      throw new ConflictException(
        'A crawl run is already queued or running for this binding',
      );
    }

    return this.crawlExecutionService.processClaimedRun(run);
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
        },
        include: { crawlJob: true },
      });
    }

    return this.prisma.xAccountBinding.update({
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
      include: { crawlJob: true },
    });
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

  private findLatestBinding(userId: string) {
    return this.prisma.xAccountBinding.findFirst({
      where: { userId },
      include: { crawlJob: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private buildNextRunAt(intervalMinutes: number) {
    const now = new Date();

    return new Date(now.getTime() + intervalMinutes * 60 * 1000);
  }
}
