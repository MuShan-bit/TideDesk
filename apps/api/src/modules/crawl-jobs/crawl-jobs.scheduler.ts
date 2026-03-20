import { CrawlRunStatus, CrawlTriggerType } from '@prisma/client';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createStructuredLogger } from '../../common/utils/structured-logger';
import { CRAWL_RUN_DISPATCHER } from './crawl-run-dispatcher.constants';
import type { CrawlRunDispatcher } from './crawl-run-dispatcher.types';
import { CrawlJobsService } from './crawl-jobs.service';

type DueCrawlJobSnapshot = {
  bindingId: string;
  bindingUserId: string;
  jobId: string | null;
  profileId: string | null;
  profileMode: string | null;
  nextRunAt: string | null;
  runId: string;
  status: CrawlRunStatus;
  triggerType: CrawlTriggerType;
  username: string;
};

@Injectable()
export class CrawlJobsScheduler {
  private readonly logger = createStructuredLogger(CrawlJobsScheduler.name);

  constructor(
    private readonly crawlJobsService: CrawlJobsService,
    @Inject(CRAWL_RUN_DISPATCHER)
    private readonly crawlRunDispatcher: CrawlRunDispatcher,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleMinuteScan() {
    await this.scanDueJobs();
  }

  async scanDueJobs(now = new Date()) {
    const dueRuns = await this.crawlJobsService.claimDueJobs({
      now,
      limit: 100,
    });
    const processedRuns = [];

    for (const run of dueRuns) {
      processedRuns.push(
        await this.crawlRunDispatcher.dispatchClaimedRun(run, now),
      );
    }

    const jobs: DueCrawlJobSnapshot[] = processedRuns.map((run) => ({
      runId: run.id,
      jobId: run.crawlJobId ?? null,
      profileId: run.crawlProfileId ?? null,
      profileMode: run.crawlProfile?.mode ?? null,
      bindingId: run.bindingId,
      bindingUserId: run.binding.userId,
      username: run.binding.username,
      nextRunAt:
        run.crawlProfile?.nextRunAt?.toISOString() ??
        run.crawlJob?.nextRunAt?.toISOString() ??
        null,
      triggerType: run.triggerType,
      status: run.status,
    }));

    if (jobs.length > 0) {
      this.logger.log('crawl_scheduler_scan_completed', {
        scannedAt: now.toISOString(),
        total: jobs.length,
        jobs,
      });
    } else {
      this.logger.debug('crawl_scheduler_scan_completed', {
        scannedAt: now.toISOString(),
        total: 0,
      });
    }

    return {
      jobs,
      scannedAt: now.toISOString(),
      total: jobs.length,
    };
  }
}
