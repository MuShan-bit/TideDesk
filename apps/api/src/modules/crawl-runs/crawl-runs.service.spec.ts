import {
  BindingStatus,
  CrawlMode,
  CrawlRunStatus,
  CrawlTriggerType,
  CredentialSource,
  UserRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { CrawlJobsService } from '../crawl-jobs/crawl-jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlRunsService } from './crawl-runs.service';

describe('CrawlJobsService and CrawlRunsService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let crawlJobsService: CrawlJobsService;
  let crawlRunsService: CrawlRunsService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    crawlJobsService = moduleRef.get(CrawlJobsService);
    crawlRunsService = moduleRef.get(CrawlRunsService);

    await prisma.user.upsert({
      where: { id: 'crawl_owner' },
      update: {
        email: 'crawl_owner@example.com',
        name: 'Crawl Owner',
        role: UserRole.USER,
      },
      create: {
        id: 'crawl_owner',
        email: 'crawl_owner@example.com',
        name: 'Crawl Owner',
        role: UserRole.USER,
      },
    });

    await prisma.xAccountBinding.deleteMany({
      where: { userId: 'crawl_owner' },
    });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('reads crawl job configuration and returns only active due jobs', async () => {
    const now = new Date('2026-03-19T03:00:00.000Z');
    const earlyBinding = await createBinding({
      crawlEnabled: true,
      nextRunAt: new Date('2026-03-19T02:30:00.000Z'),
      status: BindingStatus.ACTIVE,
      username: 'due_early',
    });
    const lateBinding = await createBinding({
      crawlEnabled: true,
      nextRunAt: new Date('2026-03-19T02:45:00.000Z'),
      status: BindingStatus.ACTIVE,
      username: 'due_late',
    });

    await createBinding({
      crawlEnabled: true,
      nextRunAt: new Date('2026-03-19T04:00:00.000Z'),
      status: BindingStatus.ACTIVE,
      username: 'future_job',
    });
    await createBinding({
      crawlEnabled: false,
      nextRunAt: new Date('2026-03-19T02:00:00.000Z'),
      status: BindingStatus.ACTIVE,
      username: 'disabled_job',
    });
    await createBinding({
      crawlEnabled: true,
      nextRunAt: new Date('2026-03-19T02:15:00.000Z'),
      status: BindingStatus.DISABLED,
      username: 'invalid_binding',
    });

    const currentJob = await crawlJobsService.getByBindingId(earlyBinding.id);

    expect(currentJob?.binding.username).toBe('due_early');
    expect(currentJob?.intervalMinutes).toBe(30);

    const dueJobs = await crawlJobsService.findDueJobs({ now, limit: 10 });
    const ownDueJobs = dueJobs.filter(
      (job) => job.binding.userId === 'crawl_owner',
    );

    expect(ownDueJobs.map((job) => job.binding.id)).toEqual([
      earlyBinding.id,
      lateBinding.id,
    ]);
  });

  it('creates crawl runs and updates both run status and next schedule', async () => {
    const binding = await createBinding({
      crawlEnabled: true,
      nextRunAt: new Date('2026-03-19T01:00:00.000Z'),
      status: BindingStatus.ACTIVE,
      username: 'runner',
    });
    const crawlJobId = binding.crawlJob!.id;

    const queuedRun = await crawlRunsService.createQueuedRun({
      bindingId: binding.id,
      crawlJobId,
      crawlProfileId: binding.crawlProfiles[0]?.id,
      triggerType: CrawlTriggerType.SCHEDULED,
    });

    expect(queuedRun.status).toBe(CrawlRunStatus.QUEUED);
    expect(queuedRun.crawlJobId).toBe(crawlJobId);
    expect(queuedRun.crawlProfileId).toBe(binding.crawlProfiles[0]?.id ?? null);

    const startedAt = new Date('2026-03-19T01:05:00.000Z');
    const runningRun = await crawlRunsService.markRunning(
      queuedRun.id,
      startedAt,
    );

    expect(runningRun).not.toBeNull();
    expect(runningRun!.status).toBe(CrawlRunStatus.RUNNING);
    expect(runningRun!.startedAt?.toISOString()).toBe(startedAt.toISOString());

    const finishedAt = new Date('2026-03-19T01:06:00.000Z');
    const completedRun = await crawlRunsService.markCompleted(queuedRun.id, {
      status: CrawlRunStatus.SUCCESS,
      fetchedCount: 20,
      newCount: 8,
      skippedCount: 12,
      failedCount: 0,
      finishedAt,
    });

    expect(completedRun.status).toBe(CrawlRunStatus.SUCCESS);
    expect(completedRun.fetchedCount).toBe(20);
    expect(completedRun.newCount).toBe(8);
    expect(completedRun.skippedCount).toBe(12);
    expect(completedRun.failedCount).toBe(0);
    expect(completedRun.finishedAt?.toISOString()).toBe(
      finishedAt.toISOString(),
    );

    const nextRunAt = new Date('2026-03-19T01:36:00.000Z');
    const updatedJob = await crawlJobsService.updateSchedule(crawlJobId, {
      lastRunAt: finishedAt,
      nextRunAt,
    });

    expect(updatedJob.lastRunAt?.toISOString()).toBe(finishedAt.toISOString());
    expect(updatedJob.nextRunAt?.toISOString()).toBe(nextRunAt.toISOString());

    const storedRun = await crawlRunsService.getById(queuedRun.id);

    expect(storedRun?.triggerType).toBe(CrawlTriggerType.SCHEDULED);
    expect(storedRun?.binding.username).toBe('runner');
  });

  it('marks a queued run as running only once', async () => {
    const binding = await createBinding({
      crawlEnabled: true,
      nextRunAt: new Date('2026-03-19T01:00:00.000Z'),
      status: BindingStatus.ACTIVE,
      username: 'single_runner',
    });
    const queuedRun = await crawlRunsService.createQueuedRun({
      bindingId: binding.id,
      crawlJobId: binding.crawlJob!.id,
      crawlProfileId: binding.crawlProfiles[0]?.id,
      triggerType: CrawlTriggerType.MANUAL,
    });
    const startedAt = new Date('2026-03-19T01:05:00.000Z');

    const [firstAttempt, secondAttempt] = await Promise.all([
      crawlRunsService.markRunning(queuedRun.id, startedAt),
      crawlRunsService.markRunning(queuedRun.id, startedAt),
    ]);

    expect([firstAttempt, secondAttempt].filter(Boolean)).toHaveLength(1);

    const storedRun = await crawlRunsService.getExecutionRunById(queuedRun.id);

    expect(storedRun?.status).toBe(CrawlRunStatus.RUNNING);
    expect(storedRun?.startedAt?.toISOString()).toBe(startedAt.toISOString());
  });

  it('claims due jobs transactionally and prevents duplicate active runs', async () => {
    const now = new Date('2026-03-19T00:01:00.000Z');
    const binding = await createBinding({
      crawlEnabled: true,
      nextRunAt: new Date('2026-03-19T00:00:00.000Z'),
      status: BindingStatus.ACTIVE,
      username: 'claim_once',
    });

    const [firstClaim, secondClaim] = await Promise.all([
      crawlJobsService.claimDueJobs({ now, limit: 1 }),
      crawlJobsService.claimDueJobs({ now, limit: 1 }),
    ]);
    const claimedRuns = [...firstClaim, ...secondClaim].filter(
      (run) => run.bindingId === binding.id,
    );

    expect(claimedRuns).toHaveLength(1);
    expect(claimedRuns[0]?.bindingId).toBe(binding.id);
    expect(claimedRuns[0]?.crawlJobId).toBe(binding.crawlJob!.id);
    expect(claimedRuns[0]?.crawlProfileId).toBeTruthy();
    expect(claimedRuns[0]?.status).toBe(CrawlRunStatus.QUEUED);

    const laterClaim = await crawlJobsService.claimDueJobs({ now, limit: 1 });

    expect(laterClaim.some((run) => run.bindingId === binding.id)).toBe(false);

    const storedRuns = await prisma.crawlRun.findMany({
      where: {
        bindingId: binding.id,
        status: {
          in: [CrawlRunStatus.QUEUED, CrawlRunStatus.RUNNING],
        },
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
        userId: 'crawl_owner',
        xUserId: `x-${input.username}`,
        username: input.username,
        displayName: `${input.username} display`,
        status: input.status,
        credentialSource: CredentialSource.WEB_LOGIN,
        authPayloadEncrypted: 'encrypted-payload',
        lastValidatedAt: new Date('2026-03-19T00:00:00.000Z'),
        crawlEnabled: input.crawlEnabled,
        crawlIntervalMinutes: 30,
        nextCrawlAt: input.nextRunAt,
        crawlJob: {
          create: {
            enabled: input.crawlEnabled,
            intervalMinutes: 30,
            nextRunAt: input.nextRunAt,
          },
        },
        crawlProfiles: {
          create: [
            {
              mode: CrawlMode.RECOMMENDED,
              enabled: input.crawlEnabled,
              intervalMinutes: 30,
              maxPosts: 20,
              nextRunAt: input.nextRunAt,
            },
          ],
        },
      },
      include: {
        crawlJob: true,
        crawlProfiles: true,
      },
    });
  }
});
