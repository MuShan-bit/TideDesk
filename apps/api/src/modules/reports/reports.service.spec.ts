import {
  BindingStatus,
  CredentialSource,
  PostType,
  ReportType,
  UserRole,
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { ArchivesService } from '../archives/archives.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let archivesService: ArchivesService;
  let reportsService: ReportsService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    archivesService = moduleRef.get(ArchivesService);
    reportsService = moduleRef.get(ReportsService);

    await prisma.user.deleteMany({
      where: {
        id: {
          in: ['report_owner', 'report_other'],
        },
      },
    });

    await prisma.user.createMany({
      data: [
        {
          id: 'report_owner',
          email: 'report_owner@example.com',
          name: 'Report Owner',
          role: UserRole.USER,
        },
        {
          id: 'report_other',
          email: 'report_other@example.com',
          name: 'Report Other',
          role: UserRole.USER,
        },
      ],
    });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates weekly and monthly reports with source post links', async () => {
    const binding = await createBinding('report_owner', 'report_weekly');
    const firstPost = await createArchive(binding.id, 'report_weekly', '001');
    const secondPost = await createArchive(binding.id, 'report_weekly', '002');

    const weeklyReport = await reportsService.createReportForUser(
      'report_owner',
      {
        reportType: ReportType.WEEKLY,
        title: '  Weekly AI Signals  ',
        periodStart: '2026-03-09T00:00:00.000Z',
        periodEnd: '2026-03-16T00:00:00.000Z',
        summaryJson: {
          totalPosts: 2,
        },
        sourcePosts: [
          {
            archivedPostId: firstPost.id,
            weightScore: 0.92,
          },
          {
            archivedPostId: secondPost.id,
          },
        ],
      },
    );
    const monthlyReport = await reportsService.createReportForUser(
      'report_owner',
      {
        reportType: ReportType.MONTHLY,
        title: 'March AI recap',
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
      },
    );

    expect(weeklyReport.title).toBe('Weekly AI Signals');
    expect(weeklyReport.reportType).toBe(ReportType.WEEKLY);
    expect(weeklyReport.sourcePosts).toHaveLength(2);
    expect(weeklyReport.sourcePosts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          archivedPostId: firstPost.id,
          weightScore: expect.objectContaining({
            toString: expect.any(Function),
          }),
        }),
      ]),
    );
    expect(
      weeklyReport.sourcePosts.find((item) => item.archivedPostId === firstPost.id)
        ?.weightScore?.toString(),
    ).toBe('0.92');
    expect(monthlyReport.reportType).toBe(ReportType.MONTHLY);
    expect(monthlyReport.sourcePosts).toHaveLength(0);
  });

  it('rejects unsupported report types and unavailable source posts', async () => {
    const ownerBinding = await createBinding('report_owner', 'report_owner_src');
    const otherBinding = await createBinding('report_other', 'report_other_src');
    const otherPost = await createArchive(otherBinding.id, 'report_other_src', '001');

    await createArchive(ownerBinding.id, 'report_owner_src', '001');

    await expect(
      reportsService.createReportForUser('report_owner', {
        reportType: ReportType.DAILY,
        title: 'Daily recap',
        periodStart: '2026-03-21T00:00:00.000Z',
        periodEnd: '2026-03-22T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      reportsService.createReportForUser('report_owner', {
        reportType: ReportType.WEEKLY,
        title: 'Cross-account source post',
        periodStart: '2026-03-09T00:00:00.000Z',
        periodEnd: '2026-03-16T00:00:00.000Z',
        sourcePosts: [
          {
            archivedPostId: otherPost.id,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists reports with pagination and loads detail only for the current user', async () => {
    const ownerBinding = await createBinding('report_owner', 'report_list_owner');
    const otherBinding = await createBinding('report_other', 'report_list_other');
    const ownerPost = await createArchive(ownerBinding.id, 'report_list_owner', '001');
    const otherPost = await createArchive(otherBinding.id, 'report_list_other', '001');

    const olderWeekly = await reportsService.createReportForUser('report_owner', {
      reportType: ReportType.WEEKLY,
      title: 'Week 10',
      periodStart: '2026-03-02T00:00:00.000Z',
      periodEnd: '2026-03-09T00:00:00.000Z',
      sourcePosts: [
        {
          archivedPostId: ownerPost.id,
        },
      ],
    });
    await reportsService.createReportForUser('report_owner', {
      reportType: ReportType.WEEKLY,
      title: 'Week 11',
      periodStart: '2026-03-09T00:00:00.000Z',
      periodEnd: '2026-03-16T00:00:00.000Z',
    });
    const otherUsersReport = await reportsService.createReportForUser(
      'report_other',
      {
        reportType: ReportType.WEEKLY,
        title: 'Other Week 11',
        periodStart: '2026-03-09T00:00:00.000Z',
        periodEnd: '2026-03-16T00:00:00.000Z',
        sourcePosts: [
          {
            archivedPostId: otherPost.id,
          },
        ],
      },
    );

    const listResult = await reportsService.listReportsByUser('report_owner', {
      reportType: ReportType.WEEKLY,
      page: 1,
      pageSize: 1,
    });
    const detail = await reportsService.getReportDetailForUser(
      'report_owner',
      olderWeekly.id,
    );

    expect(listResult.total).toBe(2);
    expect(listResult.items).toHaveLength(1);
    expect(listResult.items[0]?.title).toBe('Week 11');
    expect(listResult.items[0]?._count.sourcePosts).toBe(0);

    expect(detail.id).toBe(olderWeekly.id);
    expect(detail.sourcePosts).toHaveLength(1);
    expect(detail.sourcePosts[0]?.archivedPost.id).toBe(ownerPost.id);
    expect(detail.sourcePosts[0]?.archivedPost.binding.username).toBe(
      'report_list_owner',
    );

    await expect(
      reportsService.getReportDetailForUser('report_owner', otherUsersReport.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  async function createBinding(userId: string, username: string) {
    return prisma.xAccountBinding.create({
      data: {
        userId,
        xUserId: `x-${username}`,
        username,
        displayName: `${username} display`,
        status: BindingStatus.ACTIVE,
        credentialSource: CredentialSource.WEB_LOGIN,
        authPayloadEncrypted: 'encrypted-payload',
        lastValidatedAt: new Date('2026-03-21T00:00:00.000Z'),
        crawlEnabled: true,
        crawlIntervalMinutes: 60,
        nextCrawlAt: new Date('2026-03-21T08:00:00.000Z'),
        crawlJob: {
          create: {
            enabled: true,
            intervalMinutes: 60,
          },
        },
      },
      include: {
        crawlJob: true,
      },
    });
  }

  async function createArchive(bindingId: string, username: string, suffix: string) {
    return archivesService.createArchivedPost({
      bindingId,
      xPostId: `report-post-${suffix}`,
      postUrl: `https://x.com/${username}/status/report-post-${suffix}`,
      postType: PostType.POST,
      author: {
        username,
      },
      rawText: `Report source post ${suffix}`,
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: `report-post-${suffix}` },
      sourceCreatedAt: '2026-03-19T08:00:00.000Z',
    });
  }
});
