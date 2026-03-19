import {
  BindingStatus,
  CrawlRunStatus,
  CrawlTriggerType,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { CrawlExecutionService } from './crawl-execution.service';
import { CrawlJobsScheduler } from './crawl-jobs.scheduler';
import { CrawlJobsService } from './crawl-jobs.service';

describe('CrawlJobsScheduler', () => {
  let moduleRef: TestingModule;
  let crawlJobsScheduler: CrawlJobsScheduler;
  let crawlJobsService: {
    claimDueJobs: jest.Mock;
  };
  let crawlExecutionService: {
    processClaimedRun: jest.Mock;
  };

  beforeEach(async () => {
    crawlJobsService = {
      claimDueJobs: jest.fn(),
    };
    crawlExecutionService = {
      processClaimedRun: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        CrawlJobsScheduler,
        {
          provide: CrawlJobsService,
          useValue: crawlJobsService,
        },
        {
          provide: CrawlExecutionService,
          useValue: crawlExecutionService,
        },
      ],
    }).compile();

    crawlJobsScheduler = moduleRef.get(CrawlJobsScheduler);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('claims due jobs every minute and hands them to the crawl worker', async () => {
    const now = new Date('2026-03-19T05:00:00.000Z');
    const claimedRun = {
      id: 'run_1',
      bindingId: 'binding_1',
      crawlJobId: 'job_1',
      triggerType: CrawlTriggerType.SCHEDULED,
      status: CrawlRunStatus.QUEUED,
      binding: {
        id: 'binding_1',
        userId: 'user_1',
        xUserId: 'x_user_1',
        username: 'scheduler_due',
        displayName: 'Scheduler Due',
        avatarUrl: null,
        status: BindingStatus.ACTIVE,
        credentialSource: 'WEB_LOGIN',
        authPayloadEncrypted: 'encrypted',
        lastValidatedAt: null,
        crawlEnabled: true,
        crawlIntervalMinutes: 15,
        lastCrawledAt: null,
        nextCrawlAt: now,
        lastErrorMessage: null,
        createdAt: now,
        updatedAt: now,
      },
      crawlJob: {
        id: 'job_1',
        bindingId: 'binding_1',
        enabled: true,
        intervalMinutes: 15,
        lastRunAt: null,
        nextRunAt: new Date('2026-03-19T04:59:00.000Z'),
        createdAt: now,
        updatedAt: now,
      },
    };
    const processedRun = {
      ...claimedRun,
      status: CrawlRunStatus.SUCCESS,
      crawlJob: {
        ...claimedRun.crawlJob,
        nextRunAt: new Date('2026-03-19T05:15:00.000Z'),
      },
    };

    crawlJobsService.claimDueJobs.mockResolvedValue([claimedRun]);
    crawlExecutionService.processClaimedRun.mockResolvedValue(processedRun);

    const result = await crawlJobsScheduler.scanDueJobs(now);

    expect(crawlJobsService.claimDueJobs).toHaveBeenCalledWith({
      now,
      limit: 100,
    });
    expect(crawlExecutionService.processClaimedRun).toHaveBeenCalledWith(
      claimedRun,
      now,
    );
    expect(result).toEqual({
      scannedAt: now.toISOString(),
      total: 1,
      jobs: [
        {
          runId: 'run_1',
          jobId: 'job_1',
          bindingId: 'binding_1',
          bindingUserId: 'user_1',
          username: 'scheduler_due',
          nextRunAt: '2026-03-19T05:15:00.000Z',
          triggerType: CrawlTriggerType.SCHEDULED,
          status: CrawlRunStatus.SUCCESS,
        },
      ],
    });
  });
});
