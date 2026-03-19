import { CrawlRunStatus, CrawlTriggerType } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlExecutionService } from './crawl-execution.service';
import { CrawlJobsService } from './crawl-jobs.service';

type DueCrawlJobSnapshot = {
  bindingId: string;
  bindingUserId: string;
  jobId: string;
  nextRunAt: string | null;
  runId: string;
  status: CrawlRunStatus;
  triggerType: CrawlTriggerType;
  username: string;
};

@Injectable()
export class CrawlJobsScheduler {
  private readonly logger = new Logger(CrawlJobsScheduler.name);

  constructor(
    private readonly crawlJobsService: CrawlJobsService,
    private readonly crawlExecutionService: CrawlExecutionService,
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
        await this.crawlExecutionService.processClaimedRun(run, now),
      );
    }

    const jobs: DueCrawlJobSnapshot[] = processedRuns.map((run) => ({
      runId: run.id,
      jobId: run.crawlJobId ?? '',
      bindingId: run.bindingId,
      bindingUserId: run.binding.userId,
      username: run.binding.username,
      nextRunAt: run.crawlJob?.nextRunAt?.toISOString() ?? null,
      triggerType: run.triggerType,
      status: run.status,
    }));

    if (jobs.length > 0) {
      this.logger.log(`Claimed ${jobs.length} due crawl jobs`);
    } else {
      this.logger.debug('No due crawl jobs found in this scan window');
    }

    return {
      jobs,
      scannedAt: now.toISOString(),
      total: jobs.length,
    };
  }
}
