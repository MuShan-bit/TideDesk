import {
  BindingStatus,
  CrawlRunStatus,
  CrawlTriggerType,
  CredentialSource,
  UserRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlJobsScheduler } from './crawl-jobs.scheduler';

describe('CrawlJobsScheduler', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let crawlJobsScheduler: CrawlJobsScheduler;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    crawlJobsScheduler = moduleRef.get(CrawlJobsScheduler);

    await prisma.user.upsert({
      where: { id: 'scheduler_owner' },
      update: {
        email: 'scheduler_owner@example.com',
        name: 'Scheduler Owner',
        role: UserRole.USER,
      },
      create: {
        id: 'scheduler_owner',
        email: 'scheduler_owner@example.com',
        name: 'Scheduler Owner',
        role: UserRole.USER,
      },
    });

    await prisma.xAccountBinding.deleteMany({
      where: { userId: 'scheduler_owner' },
    });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('scans and claims due crawl jobs every minute', async () => {
    const now = new Date('2026-03-19T05:00:00.000Z');
    const dueBinding = await createBinding({
      crawlEnabled: true,
      nextRunAt: new Date('2026-03-19T04:59:00.000Z'),
      status: BindingStatus.ACTIVE,
      username: 'scheduler_due',
    });

    await createBinding({
      crawlEnabled: true,
      nextRunAt: new Date('2026-03-19T05:30:00.000Z'),
      status: BindingStatus.ACTIVE,
      username: 'scheduler_future',
    });
    await createBinding({
      crawlEnabled: false,
      nextRunAt: new Date('2026-03-19T04:30:00.000Z'),
      status: BindingStatus.ACTIVE,
      username: 'scheduler_disabled',
    });

    const result = await crawlJobsScheduler.scanDueJobs(now);
    const ownJobs = result.jobs.filter(
      (job) => job.bindingUserId === 'scheduler_owner',
    );
    const secondResult = await crawlJobsScheduler.scanDueJobs(now);
    const secondOwnJobs = secondResult.jobs.filter(
      (job) => job.bindingUserId === 'scheduler_owner',
    );

    expect(result.scannedAt).toBe(now.toISOString());
    expect(ownJobs).toHaveLength(1);
    expect(ownJobs[0]).toMatchObject({
      jobId: dueBinding.crawlJob!.id,
      bindingId: dueBinding.id,
      bindingUserId: 'scheduler_owner',
      username: 'scheduler_due',
      nextRunAt: '2026-03-19T04:59:00.000Z',
      triggerType: CrawlTriggerType.SCHEDULED,
      status: CrawlRunStatus.QUEUED,
    });
    expect(typeof ownJobs[0]?.runId).toBe('string');
    expect(secondOwnJobs).toEqual([]);

    const storedRuns = await prisma.crawlRun.findMany({
      where: {
        bindingId: dueBinding.id,
      },
    });

    expect(storedRuns).toHaveLength(1);
  });

  async function createBinding(input: {
    crawlEnabled: boolean;
    nextRunAt: Date;
    status: BindingStatus;
    username: string;
  }) {
    return prisma.xAccountBinding.create({
      data: {
        userId: 'scheduler_owner',
        xUserId: `x-${input.username}`,
        username: input.username,
        displayName: `${input.username} display`,
        status: input.status,
        credentialSource: CredentialSource.WEB_LOGIN,
        authPayloadEncrypted: 'encrypted-payload',
        lastValidatedAt: new Date('2026-03-19T00:00:00.000Z'),
        crawlEnabled: input.crawlEnabled,
        crawlIntervalMinutes: 15,
        nextCrawlAt: input.nextRunAt,
        crawlJob: {
          create: {
            enabled: input.crawlEnabled,
            intervalMinutes: 15,
            nextRunAt: input.nextRunAt,
          },
        },
      },
      include: {
        crawlJob: true,
      },
    });
  }
});
