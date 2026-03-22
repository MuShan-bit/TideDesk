import {
  BindingStatus,
  CredentialSource,
  PostType,
  PublishBindingStatus,
  PublishDraftSourceType,
  PublishPlatformType,
  ReportType,
  UserRole,
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { ArchivesService } from '../archives/archives.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { PublishingDraftsService } from './publishing-drafts.service';

describe('PublishingDraftsService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let archivesService: ArchivesService;
  let reportsService: ReportsService;
  let publishingDraftsService: PublishingDraftsService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    archivesService = moduleRef.get(ArchivesService);
    reportsService = moduleRef.get(ReportsService);
    publishingDraftsService = moduleRef.get(PublishingDraftsService);

    await prisma.user.deleteMany({
      where: {
        id: {
          in: ['publish_draft_owner', 'publish_draft_other'],
        },
      },
    });

    await prisma.user.createMany({
      data: [
        {
          id: 'publish_draft_owner',
          email: 'publish_draft_owner@example.com',
          name: 'Publish Draft Owner',
          role: UserRole.USER,
        },
        {
          id: 'publish_draft_other',
          email: 'publish_draft_other@example.com',
          name: 'Publish Draft Other',
          role: UserRole.USER,
        },
      ],
    });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates report-based publish drafts and lists them with source snapshots', async () => {
    const report = await reportsService.createReportForUser(
      'publish_draft_owner',
      {
        reportType: ReportType.WEEKLY,
        title: '  AI Weekly Signals  ',
        periodStart: '2026-03-09T00:00:00.000Z',
        periodEnd: '2026-03-16T00:00:00.000Z',
        summaryJson: {
          summary: '本周重点在多平台发布链路与草稿沉淀。',
        },
        richTextJson: {
          version: 1,
          blocks: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: '报告正文',
                },
              ],
            },
          ],
        },
        renderedHtml: '<p>报告正文</p>',
      },
    );

    const draft = await publishingDraftsService.createPublishDraft(
      'publish_draft_owner',
      {
        reportId: report.id,
      },
    );
    const list = await publishingDraftsService.listPublishDrafts(
      'publish_draft_owner',
      {
        sourceType: PublishDraftSourceType.REPORT,
      },
    );

    expect(draft.sourceType).toBe(PublishDraftSourceType.REPORT);
    expect(draft.title).toBe('AI Weekly Signals');
    expect(draft.summary).toBe('本周重点在多平台发布链路与草稿沉淀。');
    expect(draft.sourceSnapshot.reportIds).toEqual([report.id]);
    expect(draft.sourceReport?.id).toBe(report.id);
    expect(draft.sourceReport?.sourcePostsCount).toBe(0);
    expect(String(draft.renderedHtml)).toContain('报告正文');
    expect(draft.sourceArchives).toHaveLength(0);

    expect(list.total).toBe(1);
    expect(list.items[0]?.id).toBe(draft.id);
    expect(list.items[0]?.sourceSnapshot.reportIds).toEqual([report.id]);
  });

  it('creates archive-based and mixed publish drafts from archived posts', async () => {
    const binding = await createBinding(
      'publish_draft_owner',
      'publish_archive',
    );
    const firstArchive = await createArchive(
      binding.id,
      'publish_archive',
      '001',
    );
    const secondArchive = await createArchive(
      binding.id,
      'publish_archive',
      '002',
    );
    const report = await reportsService.createReportForUser(
      'publish_draft_owner',
      {
        reportType: ReportType.MONTHLY,
        title: 'March launch recap',
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
        richTextJson: {
          version: 1,
          blocks: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  text: '月报正文',
                },
              ],
            },
          ],
        },
        renderedHtml: '<p>月报正文</p>',
      },
    );

    const archiveDraft = await publishingDraftsService.createPublishDraft(
      'publish_draft_owner',
      {
        archivedPostIds: [firstArchive.id, secondArchive.id],
      },
    );
    const mixedDraft = await publishingDraftsService.createPublishDraft(
      'publish_draft_owner',
      {
        reportId: report.id,
        archivedPostIds: [firstArchive.id],
      },
    );

    expect(archiveDraft.sourceType).toBe(PublishDraftSourceType.ARCHIVE);
    expect(archiveDraft.sourceArchives).toHaveLength(2);
    expect(archiveDraft.sourceArchives[0]?.id).toBe(firstArchive.id);
    expect(archiveDraft.sourceReport).toBeNull();
    expect(archiveDraft.summary).toBe(
      '已汇总 2 条归档帖子，便于整理为后续可发布内容。',
    );
    expect(String(archiveDraft.renderedHtml)).toContain(
      'Report source post 001',
    );

    expect(mixedDraft.sourceType).toBe(PublishDraftSourceType.MIXED);
    expect(mixedDraft.sourceReport?.id).toBe(report.id);
    expect(mixedDraft.sourceArchives).toHaveLength(1);
    expect(String(mixedDraft.renderedHtml)).toContain(
      '来源报告：March launch recap',
    );
    expect(String(mixedDraft.renderedHtml)).toContain('Report source post 001');
  });

  it('validates source ownership and draft creation requirements', async () => {
    const otherBinding = await createBinding(
      'publish_draft_other',
      'publish_other_src',
    );
    const otherArchive = await createArchive(
      otherBinding.id,
      'publish_other_src',
      '001',
    );
    const otherReport = await reportsService.createReportForUser(
      'publish_draft_other',
      {
        reportType: ReportType.WEEKLY,
        title: 'Other weekly',
        periodStart: '2026-03-09T00:00:00.000Z',
        periodEnd: '2026-03-16T00:00:00.000Z',
      },
    );
    const otherDraft = await publishingDraftsService.createPublishDraft(
      'publish_draft_other',
      {
        archivedPostIds: [otherArchive.id],
      },
    );

    await expect(
      publishingDraftsService.createPublishDraft('publish_draft_owner', {}),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      publishingDraftsService.createPublishDraft('publish_draft_owner', {
        reportId: otherReport.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      publishingDraftsService.getPublishDraft(
        'publish_draft_owner',
        otherDraft.id,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates publish draft title, summary, body, tags, and target channels', async () => {
    const binding = await createBinding('publish_draft_owner', 'publish_editor');
    const archive = await createArchive(binding.id, 'publish_editor', '001');
    const firstTag = await prisma.tag.create({
      data: {
        userId: 'publish_draft_owner',
        name: 'AI',
        slug: 'ai',
      },
    });
    const secondTag = await prisma.tag.create({
      data: {
        userId: 'publish_draft_owner',
        name: 'Workflow',
        slug: 'workflow',
      },
    });
    const channel = await prisma.publishChannelBinding.create({
      data: {
        userId: 'publish_draft_owner',
        platformType: PublishPlatformType.WECHAT,
        displayName: '微信公众号主号',
        accountIdentifier: 'gh_editor',
        authPayloadEncrypted: 'encrypted-channel',
        status: PublishBindingStatus.ACTIVE,
      },
    });
    const draft = await publishingDraftsService.createPublishDraft(
      'publish_draft_owner',
      {
        archivedPostIds: [archive.id],
      },
    );

    const updatedDraft = await publishingDraftsService.updatePublishDraft(
      'publish_draft_owner',
      draft.id,
      {
        title: '新的发布标题',
        summary: '新的发布摘要',
        bodyText: '第一段正文\n\n第二段正文',
        tagIds: [firstTag.id, secondTag.id],
        targetChannelIds: [channel.id],
      },
    );

    expect(updatedDraft.title).toBe('新的发布标题');
    expect(updatedDraft.summary).toBe('新的发布摘要');
    expect(String(updatedDraft.renderedHtml)).toContain('第一段正文');
    expect(String(updatedDraft.renderedHtml)).toContain('第二段正文');
    expect(updatedDraft.tagAssignments).toHaveLength(2);
    expect(updatedDraft.tagAssignments.map((item) => item.tag.id)).toEqual([
      firstTag.id,
      secondTag.id,
    ]);
    expect(updatedDraft.targetChannels).toHaveLength(1);
    expect(updatedDraft.targetChannels[0]?.channelBinding.id).toBe(channel.id);

    const clearedDraft = await publishingDraftsService.updatePublishDraft(
      'publish_draft_owner',
      draft.id,
      {
        summary: '',
        tagIds: [],
        targetChannelIds: [],
      },
    );

    expect(clearedDraft.summary).toBeNull();
    expect(clearedDraft.tagAssignments).toHaveLength(0);
    expect(clearedDraft.targetChannels).toHaveLength(0);
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

  async function createArchive(
    bindingId: string,
    username: string,
    suffix: string,
  ) {
    return archivesService.createArchivedPost({
      bindingId,
      xPostId: `publish-draft-post-${suffix}`,
      postUrl: `https://x.com/${username}/status/publish-draft-post-${suffix}`,
      postType: PostType.POST,
      author: {
        username,
      },
      rawText: `Report source post ${suffix}`,
      richTextJson: {
        version: 1,
        blocks: [
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: `Report source post ${suffix}`,
              },
            ],
          },
        ],
      },
      rawPayloadJson: { id: `publish-draft-post-${suffix}` },
      sourceCreatedAt: '2026-03-19T08:00:00.000Z',
    });
  }
});
