import { BindingStatus, CrawlRunStatus, type Prisma } from '@prisma/client';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ArchivesService } from '../archives/archives.service';
import { convertNormalizedPostToRichText } from '../archives/rich-text.converter';
import { renderRichTextToHtml } from '../archives/rich-text.renderer';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { FEED_CRAWLER_ADAPTER } from '../crawler/crawler.constants';
import type { FeedCrawlerAdapter } from '../crawler/crawler.types';
import { CrawlerAuthError } from '../crawler/errors/crawler-adapter.error';
import { PrismaService } from '../prisma/prisma.service';
import {
  type CrawlExecutionRun,
  CrawlRunsService,
} from '../crawl-runs/crawl-runs.service';

@Injectable()
export class CrawlExecutionService {
  private readonly logger = new Logger(CrawlExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly archivesService: ArchivesService,
    private readonly credentialCryptoService: CredentialCryptoService,
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
    if (!queuedRun.binding || !queuedRun.crawlJob) {
      throw new NotFoundException(
        'Crawl run is missing binding or crawl job context',
      );
    }

    if (queuedRun.status !== CrawlRunStatus.QUEUED) {
      return queuedRun;
    }

    const runningRun = await this.crawlRunsService.markRunning(queuedRun.id);
    const binding = runningRun.binding;
    const now = processedAt;

    try {
      const credentialPayload = this.credentialCryptoService.decrypt(
        binding.authPayloadEncrypted,
      );
      const rawFeed =
        await this.feedCrawlerAdapter.fetchRecommendedFeed(credentialPayload);
      const normalizedPosts =
        await this.feedCrawlerAdapter.normalizePosts(rawFeed);
      let newCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      let errorMessage: string | null = null;

      for (const post of normalizedPosts) {
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
            });

          if (result.created) {
            newCount += 1;
          } else {
            skippedCount += 1;
          }
        } catch (error) {
          failedCount += 1;
          errorMessage =
            errorMessage ??
            (error instanceof Error
              ? error.message
              : `Failed to archive post ${post.xPostId}`);
        }
      }

      const nextRunAt = binding.crawlEnabled
        ? new Date(now.getTime() + binding.crawlIntervalMinutes * 60 * 1000)
        : null;
      const completedStatus =
        failedCount > 0
          ? newCount + skippedCount > 0
            ? CrawlRunStatus.PARTIAL_FAILED
            : CrawlRunStatus.FAILED
          : CrawlRunStatus.SUCCESS;

      await this.prisma.$transaction([
        this.prisma.xAccountBinding.update({
          where: { id: binding.id },
          data: {
            status: BindingStatus.ACTIVE,
            lastCrawledAt: now,
            lastErrorMessage: errorMessage,
            nextCrawlAt: nextRunAt,
          },
        }),
        this.prisma.crawlJob.update({
          where: { id: queuedRun.crawlJob.id },
          data: {
            enabled: binding.crawlEnabled,
            lastRunAt: now,
            nextRunAt,
          },
        }),
      ]);

      return this.crawlRunsService.markCompleted(queuedRun.id, {
        status: completedStatus,
        finishedAt: now,
        fetchedCount: normalizedPosts.length,
        newCount,
        skippedCount,
        failedCount,
        errorMessage,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown crawl worker error';
      const isAuthError = error instanceof CrawlerAuthError;
      const nextRunAt =
        !isAuthError && binding.crawlEnabled
          ? new Date(now.getTime() + binding.crawlIntervalMinutes * 60 * 1000)
          : null;

      await this.prisma.$transaction([
        this.prisma.xAccountBinding.update({
          where: { id: binding.id },
          data: {
            status: isAuthError ? BindingStatus.INVALID : binding.status,
            lastErrorMessage: message,
            nextCrawlAt: nextRunAt,
            crawlEnabled: isAuthError ? false : binding.crawlEnabled,
          },
        }),
        this.prisma.crawlJob.update({
          where: { id: queuedRun.crawlJob.id },
          data: {
            enabled: isAuthError ? false : binding.crawlEnabled,
            lastRunAt: now,
            nextRunAt,
          },
        }),
      ]);

      this.logger.error(
        `Failed to process crawl run ${queuedRun.id} for binding ${binding.id}: ${message}`,
      );

      return this.crawlRunsService.markCompleted(queuedRun.id, {
        status: CrawlRunStatus.FAILED,
        finishedAt: now,
        errorMessage: message,
      });
    }
  }

  private toInputJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
