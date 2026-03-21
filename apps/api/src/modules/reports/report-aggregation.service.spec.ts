import {
  BindingStatus,
  CrawlMode,
  CredentialSource,
  PostType,
  TaxonomySource,
  UserRole,
} from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { ArchivesService } from '../archives/archives.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportAggregationService } from './report-aggregation.service';

describe('ReportAggregationService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let archivesService: ArchivesService;
  let reportAggregationService: ReportAggregationService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    archivesService = moduleRef.get(ArchivesService);
    reportAggregationService = moduleRef.get(ReportAggregationService);

    await prisma.user.deleteMany({
      where: {
        id: {
          in: ['report_aggregate_owner', 'report_aggregate_other'],
        },
      },
    });

    await prisma.user.createMany({
      data: [
        {
          id: 'report_aggregate_owner',
          email: 'report_aggregate_owner@example.com',
          name: 'Aggregate Owner',
          role: UserRole.USER,
        },
        {
          id: 'report_aggregate_other',
          email: 'report_aggregate_other@example.com',
          name: 'Aggregate Other',
          role: UserRole.USER,
        },
      ],
    });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('aggregates posts by binding, crawl mode, category and tag', async () => {
    const dataset = await seedAggregateDataset();

    const aggregate = await reportAggregationService.aggregatePeriodForUser(
      'report_aggregate_owner',
      {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
      },
    );

    expect(aggregate.totalPosts).toBe(3);
    expect(aggregate.bindings).toEqual([
      expect.objectContaining({
        bindingId: dataset.bindingA.id,
        count: 2,
      }),
      expect.objectContaining({
        bindingId: dataset.bindingB.id,
        count: 1,
      }),
    ]);
    expect(aggregate.modes).toEqual(
      expect.arrayContaining([
        { mode: CrawlMode.HOT, count: 2 },
        { mode: CrawlMode.RECOMMENDED, count: 1 },
        { mode: CrawlMode.SEARCH, count: 1 },
      ]),
    );
    expect(aggregate.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categoryId: dataset.aiCategory.id,
          count: 2,
        }),
        expect.objectContaining({
          categoryId: dataset.infraCategory.id,
          count: 1,
        }),
      ]),
    );
    expect(aggregate.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tagId: dataset.openAiTag.id,
          count: 2,
        }),
        expect.objectContaining({
          tagId: dataset.agentsTag.id,
          count: 2,
        }),
      ]),
    );
    expect(aggregate.posts[0]?.sourceCreatedAt >= aggregate.posts[1]?.sourceCreatedAt).toBe(
      true,
    );
  });

  it('supports filtering and rejects foreign filters', async () => {
    const dataset = await seedAggregateDataset();
    const otherBinding = await createBinding(
      'report_aggregate_other',
      'aggregate_other',
    );
    const foreignCategory = await prisma.category.create({
      data: {
        userId: 'report_aggregate_other',
        name: 'Foreign',
        slug: 'foreign',
        color: '#64748b',
      },
    });
    const foreignTag = await prisma.tag.create({
      data: {
        userId: 'report_aggregate_other',
        name: 'Foreign Tag',
        slug: 'foreign-tag',
        color: '#64748b',
      },
    });

    const byBinding = await reportAggregationService.aggregatePeriodForUser(
      'report_aggregate_owner',
      {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
        bindingIds: [dataset.bindingB.id],
      },
    );
    const byMode = await reportAggregationService.aggregatePeriodForUser(
      'report_aggregate_owner',
      {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
        modes: [CrawlMode.HOT],
      },
    );
    const byCategory = await reportAggregationService.aggregatePeriodForUser(
      'report_aggregate_owner',
      {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
        categoryIds: [dataset.aiCategory.id],
      },
    );
    const byTag = await reportAggregationService.aggregatePeriodForUser(
      'report_aggregate_owner',
      {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
        tagIds: [dataset.openAiTag.id],
      },
    );

    expect(byBinding.totalPosts).toBe(1);
    expect(byBinding.bindings[0]?.bindingId).toBe(dataset.bindingB.id);

    expect(byMode.totalPosts).toBe(2);
    expect(byMode.modes).toEqual(
      expect.arrayContaining([
        { mode: CrawlMode.HOT, count: 2 },
      ]),
    );

    expect(byCategory.totalPosts).toBe(2);
    expect(byTag.totalPosts).toBe(2);

    await expect(
      reportAggregationService.aggregatePeriodForUser('report_aggregate_owner', {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
        bindingIds: [otherBinding.id],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      reportAggregationService.aggregatePeriodForUser('report_aggregate_owner', {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
        categoryIds: [foreignCategory.id],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      reportAggregationService.aggregatePeriodForUser('report_aggregate_owner', {
        periodStart: '2026-03-01T00:00:00.000Z',
        periodEnd: '2026-04-01T00:00:00.000Z',
        tagIds: [foreignTag.id],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  async function seedAggregateDataset() {
    const bindingA = await createBinding(
      'report_aggregate_owner',
      'aggregate_owner_a',
    );
    const bindingB = await createBinding(
      'report_aggregate_owner',
      'aggregate_owner_b',
    );
    const aiCategory = await prisma.category.create({
      data: {
        userId: 'report_aggregate_owner',
        name: 'AI',
        slug: 'ai',
        color: '#2563eb',
      },
    });
    const infraCategory = await prisma.category.create({
      data: {
        userId: 'report_aggregate_owner',
        name: 'Infra',
        slug: 'infra',
        color: '#0f766e',
      },
    });
    const openAiTag = await prisma.tag.create({
      data: {
        userId: 'report_aggregate_owner',
        name: 'OpenAI',
        slug: 'openai',
        color: '#10b981',
      },
    });
    const agentsTag = await prisma.tag.create({
      data: {
        userId: 'report_aggregate_owner',
        name: 'Agents',
        slug: 'agents',
        color: '#7c3aed',
      },
    });

    const postOne = await createArchive(bindingA.id, 'aggregate_owner_a', '001');
    const postTwo = await createArchive(bindingA.id, 'aggregate_owner_a', '002');
    const postThree = await createArchive(bindingB.id, 'aggregate_owner_b', '003');

    await prisma.archivedPost.update({
      where: {
        id: postOne.id,
      },
      data: {
        primaryCategoryId: aiCategory.id,
        primaryCategorySource: TaxonomySource.MANUAL,
      },
    });
    await prisma.archivedPost.update({
      where: {
        id: postTwo.id,
      },
      data: {
        primaryCategoryId: aiCategory.id,
        primaryCategorySource: TaxonomySource.AI,
      },
    });
    await prisma.archivedPost.update({
      where: {
        id: postThree.id,
      },
      data: {
        primaryCategoryId: infraCategory.id,
        primaryCategorySource: TaxonomySource.MANUAL,
      },
    });
    await prisma.archivedPostTag.createMany({
      data: [
        {
          archivedPostId: postOne.id,
          tagId: openAiTag.id,
          source: TaxonomySource.MANUAL,
        },
        {
          archivedPostId: postOne.id,
          tagId: agentsTag.id,
          source: TaxonomySource.AI,
        },
        {
          archivedPostId: postTwo.id,
          tagId: agentsTag.id,
          source: TaxonomySource.AI,
        },
        {
          archivedPostId: postTwo.id,
          tagId: agentsTag.id,
          source: TaxonomySource.MANUAL,
        },
        {
          archivedPostId: postThree.id,
          tagId: openAiTag.id,
          source: TaxonomySource.AI,
        },
      ],
      skipDuplicates: true,
    });
    await prisma.archiveOccurrence.createMany({
      data: [
        {
          archivedPostId: postOne.id,
          bindingId: bindingA.id,
          crawlProfileId: bindingA.recommendedProfileId,
          sourcePostId: postOne.xPostId,
        },
        {
          archivedPostId: postOne.id,
          bindingId: bindingA.id,
          crawlProfileId: bindingA.hotProfileId,
          sourcePostId: postOne.xPostId,
        },
        {
          archivedPostId: postTwo.id,
          bindingId: bindingA.id,
          crawlProfileId: bindingA.hotProfileId,
          sourcePostId: postTwo.xPostId,
        },
        {
          archivedPostId: postThree.id,
          bindingId: bindingB.id,
          crawlProfileId: bindingB.searchProfileId,
          sourcePostId: postThree.xPostId,
        },
      ],
    });

    return {
      bindingA,
      bindingB,
      aiCategory,
      infraCategory,
      openAiTag,
      agentsTag,
    };
  }

  async function createBinding(userId: string, username: string) {
    const binding = await prisma.xAccountBinding.create({
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
        crawlProfiles: {
          create: [
            {
              mode: CrawlMode.RECOMMENDED,
              isSystemDefault: true,
              enabled: true,
              intervalMinutes: 60,
              maxPosts: 20,
            },
            {
              mode: CrawlMode.HOT,
              enabled: true,
              intervalMinutes: 60,
              maxPosts: 20,
            },
            {
              mode: CrawlMode.SEARCH,
              enabled: true,
              intervalMinutes: 60,
              queryText: 'ai',
              maxPosts: 20,
            },
          ],
        },
      },
      include: {
        crawlProfiles: true,
      },
    });

    return {
      ...binding,
      recommendedProfileId:
        binding.crawlProfiles.find((profile) => profile.mode === CrawlMode.RECOMMENDED)
          ?.id ?? null,
      hotProfileId:
        binding.crawlProfiles.find((profile) => profile.mode === CrawlMode.HOT)?.id ??
        null,
      searchProfileId:
        binding.crawlProfiles.find((profile) => profile.mode === CrawlMode.SEARCH)
          ?.id ?? null,
    };
  }

  async function createArchive(bindingId: string, username: string, suffix: string) {
    return archivesService.createArchivedPost({
      bindingId,
      xPostId: `aggregate-post-${suffix}`,
      postUrl: `https://x.com/${username}/status/aggregate-post-${suffix}`,
      postType: PostType.POST,
      author: {
        username,
      },
      rawText: `Aggregate source post ${suffix}`,
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: `aggregate-post-${suffix}` },
      sourceCreatedAt:
        suffix === '001'
          ? '2026-03-21T10:00:00.000Z'
          : suffix === '002'
            ? '2026-03-20T10:00:00.000Z'
            : '2026-03-19T10:00:00.000Z',
    });
  }
});
