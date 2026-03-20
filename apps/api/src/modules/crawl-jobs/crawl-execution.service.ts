import {
  BindingStatus,
  CrawlMode,
  CrawlScheduleKind,
  CrawlRunStatus,
  type Prisma,
} from '@prisma/client';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ArchivesService } from '../archives/archives.service';
import { convertNormalizedPostToRichText } from '../archives/rich-text.converter';
import { renderRichTextToHtml } from '../archives/rich-text.renderer';
import { createStructuredLogger } from '../../common/utils/structured-logger';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { FEED_CRAWLER_ADAPTER } from '../crawler/crawler.constants';
import type { FeedCrawlerAdapter } from '../crawler/crawler.types';
import { CrawlerAuthError } from '../crawler/errors/crawler-adapter.error';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlRunPostsService } from '../crawl-runs/crawl-run-posts.service';
import {
  type CrawlExecutionRun,
  CrawlRunsService,
} from '../crawl-runs/crawl-runs.service';
import {
  getNextRunAtForSchedule,
  type CrawlScheduleConfig,
} from '../../common/utils/crawl-schedule';

@Injectable()
export class CrawlExecutionService {
  private readonly logger = createStructuredLogger(CrawlExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly archivesService: ArchivesService,
    private readonly credentialCryptoService: CredentialCryptoService,
    private readonly crawlRunPostsService: CrawlRunPostsService,
    private readonly crawlRunsService: CrawlRunsService,
    @Inject(FEED_CRAWLER_ADAPTER)
    private readonly feedCrawlerAdapter: FeedCrawlerAdapter,
  ) {}

  async processRun(runId: string, processedAt = new Date()) {
    const queuedRun = await this.crawlRunsService.getExecutionRunById(runId);

    if (!queuedRun) {
      throw new NotFoundException('Crawl run not found');
    }

    return this.processClaimedRun(queuedRun, processedAt);
  }

  async processClaimedRun(
    queuedRun: CrawlExecutionRun,
    processedAt = new Date(),
  ) {
    if (!queuedRun.binding) {
      throw new NotFoundException('Crawl run is missing binding context');
    }

    if (queuedRun.status !== CrawlRunStatus.QUEUED) {
      return queuedRun;
    }

    const runningRun = await this.crawlRunsService.markRunning(
      queuedRun.id,
      processedAt,
    );

    if (!runningRun) {
      const currentRun = await this.crawlRunsService.getExecutionRunById(
        queuedRun.id,
      );

      if (!currentRun) {
        throw new NotFoundException('Crawl run not found');
      }

      return currentRun;
    }

    const binding = runningRun.binding;
    const crawlProfile = runningRun.crawlProfile;
    const crawlMode = crawlProfile?.mode ?? CrawlMode.RECOMMENDED;
    const now = processedAt;
    const logContext = {
      userId: binding.userId,
      bindingId: binding.id,
      crawlRunId: runningRun.id,
      crawlProfileId: crawlProfile?.id ?? null,
    } as const;

    this.logger.log('crawl_run_started', {
      ...logContext,
      triggerType: runningRun.triggerType,
    });

    try {
      const credentialPayload = this.credentialCryptoService.decrypt(
        binding.authPayloadEncrypted,
      );
      const rawFeed = await this.fetchFeedForProfile(
        crawlMode,
        credentialPayload,
        crawlProfile?.queryText ?? null,
      );
      const normalizedPosts = await this.feedCrawlerAdapter.normalizePosts(
        rawFeed,
      );
      const postsToArchive = crawlProfile?.maxPosts
        ? normalizedPosts.slice(0, crawlProfile.maxPosts)
        : normalizedPosts;
      let newCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      let errorMessage: string | null = null;

      for (const post of postsToArchive) {
        try {
          const richTextJson = convertNormalizedPostToRichText(post);
          const renderedHtml = renderRichTextToHtml(richTextJson);
          const result =
            await this.archivesService.createArchivedPostWithConflictFallback({
              bindingId: binding.id,
              firstCrawlRunId: runningRun.id,
              xPostId: post.xPostId,
              postUrl: post.postUrl,
              postType: post.postType,
              author: {
                xUserId: post.author.xUserId,
                username: post.author.username,
                displayName: post.author.displayName,
                avatarUrl: post.author.avatarUrl,
              },
              language: post.language,
              rawText: post.rawText,
              richTextJson: this.toInputJsonValue(richTextJson),
              renderedHtml,
              rawPayloadJson: this.toInputJsonValue(post.rawPayloadJson),
              sourceCreatedAt: post.sourceCreatedAt,
              replyCount: post.replyCount,
              repostCount: post.repostCount,
              quoteCount: post.quoteCount,
              favoriteCount: post.favoriteCount,
              viewCount: post.viewCount,
              media: post.media.map((media) => ({
                mediaType: media.mediaType,
                sourceUrl: media.sourceUrl,
                previewUrl: media.previewUrl,
                width: media.width,
                height: media.height,
              })),
              relations: post.relations.map((relation) => ({
                relationType: relation.relationType,
                targetXPostId: relation.targetXPostId,
                targetUrl: relation.targetUrl,
                targetAuthorUsername: relation.targetAuthorUsername,
                snapshotJson:
                  relation.snapshotJson === undefined
                    ? undefined
                    : this.toInputJsonValue(relation.snapshotJson),
              })),
            });

          await this.crawlRunPostsService.createRecord({
            crawlRunId: runningRun.id,
            xPostId: post.xPostId,
            archivedPostId: result.archivedPost.id,
            actionType: result.created ? 'CREATED' : 'SKIPPED',
            reason: result.created ? 'archived' : 'already_archived',
            rawPayloadJson: this.toInputJsonValue(post.rawPayloadJson),
          });

          if (result.created) {
            newCount += 1;
          } else {
            skippedCount += 1;
          }
        } catch (error) {
          failedCount += 1;
          const failureReason =
            error instanceof Error
              ? error.message
              : `Failed to archive post ${post.xPostId}`;
          errorMessage = errorMessage ?? failureReason;

          this.logger.warn('crawl_post_archive_failed', {
            ...logContext,
            xPostId: post.xPostId,
            reason: failureReason,
          });

          await this.crawlRunPostsService.createRecord({
            crawlRunId: runningRun.id,
            xPostId: post.xPostId,
            actionType: 'FAILED',
            reason: failureReason,
            rawPayloadJson: this.toInputJsonValue(post.rawPayloadJson),
          });
        }
      }

      const nextRunAt = this.buildNextRunAtForProfile(
        crawlProfile?.scheduleKind ?? CrawlScheduleKind.INTERVAL,
        crawlProfile?.scheduleCron ?? null,
        crawlProfile?.intervalMinutes ?? binding.crawlIntervalMinutes,
        binding.crawlEnabled && (crawlProfile?.enabled ?? true),
        now,
      );
      const completedStatus =
        failedCount > 0
          ? newCount + skippedCount > 0
            ? CrawlRunStatus.PARTIAL_FAILED
            : CrawlRunStatus.FAILED
          : CrawlRunStatus.SUCCESS;

      const successUpdates: Prisma.PrismaPromise<unknown>[] = [
        this.prisma.xAccountBinding.update({
          where: { id: binding.id },
          data: {
            status: BindingStatus.ACTIVE,
            lastCrawledAt: now,
            lastErrorMessage: errorMessage,
            nextCrawlAt: this.shouldSyncLegacySchedule(crawlMode)
              ? nextRunAt
              : binding.nextCrawlAt,
          },
        }),
      ];

      if (crawlProfile) {
        successUpdates.push(
          this.prisma.crawlProfile.update({
            where: { id: crawlProfile.id },
            data: {
              lastRunAt: now,
              nextRunAt,
            },
          }),
        );
      }

      if (queuedRun.crawlJob && this.shouldSyncLegacySchedule(crawlMode)) {
        successUpdates.push(
          this.prisma.crawlJob.update({
            where: { id: queuedRun.crawlJob.id },
            data: {
              enabled: binding.crawlEnabled,
              lastRunAt: now,
              nextRunAt,
            },
          }),
        );
      }

      await this.prisma.$transaction(successUpdates);

      const completedRun = await this.crawlRunsService.markCompleted(
        queuedRun.id,
        {
          status: completedStatus,
          finishedAt: now,
          fetchedCount: postsToArchive.length,
          newCount,
          skippedCount,
          failedCount,
          errorMessage,
        },
      );

      this.logger.log('crawl_run_completed', {
        ...logContext,
        status: completedStatus,
        fetchedCount: postsToArchive.length,
        newCount,
        skippedCount,
        failedCount,
      });

      return completedRun;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown crawl worker error';
      const isAuthError = error instanceof CrawlerAuthError;
      const nextRunAt = this.buildNextRunAtForProfile(
        crawlProfile?.scheduleKind ?? CrawlScheduleKind.INTERVAL,
        crawlProfile?.scheduleCron ?? null,
        crawlProfile?.intervalMinutes ?? binding.crawlIntervalMinutes,
        !isAuthError && binding.crawlEnabled && (crawlProfile?.enabled ?? true),
        now,
      );

      const failureUpdates: Prisma.PrismaPromise<unknown>[] = [
        this.prisma.xAccountBinding.update({
          where: { id: binding.id },
          data: {
            status: isAuthError ? BindingStatus.INVALID : binding.status,
            lastErrorMessage: message,
            nextCrawlAt:
              isAuthError || this.shouldSyncLegacySchedule(crawlMode)
                ? nextRunAt
                : binding.nextCrawlAt,
            crawlEnabled: isAuthError ? false : binding.crawlEnabled,
          },
        }),
      ];

      if (isAuthError) {
        failureUpdates.push(
          this.prisma.crawlProfile.updateMany({
            where: {
              bindingId: binding.id,
            },
            data: {
              enabled: false,
              nextRunAt: null,
            },
          }),
        );
      } else if (crawlProfile) {
        failureUpdates.push(
          this.prisma.crawlProfile.update({
            where: { id: crawlProfile.id },
            data: {
              lastRunAt: now,
              nextRunAt,
            },
          }),
        );
      }

      if (
        queuedRun.crawlJob &&
        (isAuthError || this.shouldSyncLegacySchedule(crawlMode))
      ) {
        failureUpdates.push(
          this.prisma.crawlJob.update({
            where: { id: queuedRun.crawlJob.id },
            data: {
              enabled: isAuthError ? false : binding.crawlEnabled,
              lastRunAt: now,
              nextRunAt,
            },
          }),
        );
      }

      await this.prisma.$transaction(failureUpdates);

      this.logger.error('crawl_run_failed', {
        ...logContext,
        authError: isAuthError,
        message,
      });

      return this.crawlRunsService.markCompleted(queuedRun.id, {
        status: CrawlRunStatus.FAILED,
        finishedAt: now,
        errorMessage: message,
      });
    }
  }

  private async fetchFeedForProfile(
    mode: CrawlMode,
    payload: string,
    queryText: string | null,
  ) {
    switch (mode) {
      case CrawlMode.RECOMMENDED:
        return this.feedCrawlerAdapter.fetchRecommendedFeed(payload);
      case CrawlMode.HOT:
        return this.feedCrawlerAdapter.fetchHotFeed(payload);
      case CrawlMode.SEARCH:
        if (!queryText?.trim()) {
          throw new Error('Search crawl profile requires a query text');
        }

        return this.feedCrawlerAdapter.fetchSearchFeed(payload, queryText);
    }
  }

  private buildNextRunAtForProfile(
    scheduleKind: CrawlScheduleKind,
    scheduleCron: string | null,
    intervalMinutes: number,
    enabled: boolean,
    now: Date,
  ) {
    if (!enabled) {
      return null;
    }

    const scheduleConfig: CrawlScheduleConfig =
      scheduleKind === CrawlScheduleKind.CRON
        ? {
            scheduleKind,
            scheduleCron,
            intervalMinutes,
          }
        : {
            scheduleKind: CrawlScheduleKind.INTERVAL,
            scheduleCron: null,
            intervalMinutes,
          };

    return getNextRunAtForSchedule(scheduleConfig, now);
  }

  private shouldSyncLegacySchedule(mode: CrawlMode) {
    return mode === CrawlMode.RECOMMENDED;
  }

  private toInputJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
