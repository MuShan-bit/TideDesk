import {
  BindingStatus,
  CrawlMode,
  CrawlRunStatus,
  CrawlTriggerType,
  CredentialSource,
  UserRole,
} from '@prisma/client';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { CrawlRunsService } from '../crawl-runs/crawl-runs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CrawlExecutionService } from './crawl-execution.service';

describe('CrawlExecutionService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let credentialCryptoService: CredentialCryptoService;
  let crawlRunsService: CrawlRunsService;
  let crawlExecutionService: CrawlExecutionService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    credentialCryptoService = moduleRef.get(CredentialCryptoService);
    crawlRunsService = moduleRef.get(CrawlRunsService);
    crawlExecutionService = moduleRef.get(CrawlExecutionService);

    await prisma.user.upsert({
      where: { id: 'worker_owner' },
      update: {
        email: 'worker_owner@example.com',
        name: 'Worker Owner',
        role: UserRole.USER,
      },
      create: {
        id: 'worker_owner',
        email: 'worker_owner@example.com',
        name: 'Worker Owner',
        role: UserRole.USER,
      },
    });

    await prisma.xAccountBinding.deleteMany({
      where: { userId: 'worker_owner' },
    });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await moduleRef.close();
  });

  it('processes a queued crawl run into archives and updates run state', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const binding = await prisma.xAccountBinding.create({
      data: {
        userId: 'worker_owner',
        xUserId: 'x-worker',
        username: 'worker_demo',
        displayName: 'Worker Demo',
        status: BindingStatus.ACTIVE,
        credentialSource: CredentialSource.WEB_LOGIN,
        authPayloadEncrypted: credentialCryptoService.encrypt(
          '{"cookie":"worker"}',
        ),
        lastValidatedAt: new Date('2026-03-19T00:00:00.000Z'),
        crawlEnabled: true,
        crawlIntervalMinutes: 30,
        nextCrawlAt: new Date('2026-03-19T12:00:00.000Z'),
        crawlJob: {
          create: {
            enabled: true,
            intervalMinutes: 30,
            nextRunAt: new Date('2026-03-19T12:00:00.000Z'),
          },
        },
        crawlProfiles: {
          create: [
            {
              mode: CrawlMode.RECOMMENDED,
              enabled: true,
              intervalMinutes: 30,
              maxPosts: 20,
              nextRunAt: new Date('2026-03-19T12:00:00.000Z'),
            },
          ],
        },
      },
      include: {
        crawlJob: true,
        crawlProfiles: true,
      },
    });

    const run = await crawlRunsService.createQueuedRun({
      bindingId: binding.id,
      crawlJobId: binding.crawlJob!.id,
      crawlProfileId: binding.crawlProfiles[0]?.id,
      triggerType: CrawlTriggerType.MANUAL,
    });

    const processedRun = await crawlExecutionService.processRun(run.id);

    expect(processedRun.status).toBe(CrawlRunStatus.SUCCESS);
    expect(processedRun.fetchedCount).toBe(2);
    expect(processedRun.newCount).toBe(2);
    expect(processedRun.skippedCount).toBe(0);
    expect(processedRun.failedCount).toBe(0);

    const archivedPosts = await prisma.archivedPost.findMany({
      where: {
        bindingId: binding.id,
      },
    });
    const runPosts = await prisma.crawlRunPost.findMany({
      where: {
        crawlRunId: run.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(archivedPosts).toHaveLength(2);
    expect(runPosts).toHaveLength(2);
    expect(runPosts.every((item) => item.actionType === 'CREATED')).toBe(true);

    const storedBinding = await prisma.xAccountBinding.findUnique({
      where: { id: binding.id },
    });
    const storedProfile = await prisma.crawlProfile.findUnique({
      where: { id: binding.crawlProfiles[0]!.id },
    });

    expect(storedBinding?.lastCrawledAt).not.toBeNull();
    expect(storedBinding?.lastErrorMessage).toBeNull();
    expect(storedProfile?.lastRunAt).not.toBeNull();
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      JSON.stringify({
        event: 'crawl_run_started',
        userId: 'worker_owner',
        bindingId: binding.id,
        crawlRunId: run.id,
        crawlProfileId: binding.crawlProfiles[0]!.id,
        triggerType: CrawlTriggerType.MANUAL,
      }),
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      JSON.stringify({
        event: 'crawl_run_completed',
        userId: 'worker_owner',
        bindingId: binding.id,
        crawlRunId: run.id,
        crawlProfileId: binding.crawlProfiles[0]!.id,
        status: CrawlRunStatus.SUCCESS,
        fetchedCount: 2,
        newCount: 2,
        skippedCount: 0,
        failedCount: 0,
      }),
    );
  });
});
