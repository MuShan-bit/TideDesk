import {
  BindingStatus,
  CrawlRunStatus,
  CrawlTriggerType,
  CredentialSource,
  MediaType,
  PostType,
  RelationType,
  TaxonomySource,
  UserRole,
} from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { ArchivesService } from './archives.service';

describe('ArchivesService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let archivesService: ArchivesService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    archivesService = moduleRef.get(ArchivesService);

    await prisma.user.upsert({
      where: { id: 'archive_owner' },
      update: {
        email: 'archive_owner@example.com',
        name: 'Archive Owner',
        role: UserRole.USER,
      },
      create: {
        id: 'archive_owner',
        email: 'archive_owner@example.com',
        name: 'Archive Owner',
        role: UserRole.USER,
      },
    });

    await prisma.xAccountBinding.deleteMany({
      where: { userId: 'archive_owner' },
    });
    await prisma.archivedPostTag.deleteMany({
      where: {
        tag: {
          userId: 'archive_owner',
        },
      },
    });
    await prisma.tag.deleteMany({
      where: {
        userId: 'archive_owner',
      },
    });
    await prisma.category.deleteMany({
      where: {
        userId: 'archive_owner',
      },
    });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('writes archived post main data, media, relations and supports detail queries', async () => {
    const binding = await createBinding('archive_writer');
    const run = await prisma.crawlRun.create({
      data: {
        bindingId: binding.id,
        crawlJobId: binding.crawlJob!.id,
        triggerType: CrawlTriggerType.SCHEDULED,
        status: CrawlRunStatus.SUCCESS,
      },
    });

    const archivedPost = await archivesService.createArchivedPost({
      bindingId: binding.id,
      firstCrawlRunId: run.id,
      xPostId: 'post-001',
      postUrl: 'https://x.com/archive_writer/status/post-001',
      postType: PostType.POST,
      author: {
        xUserId: 'author-001',
        username: 'archive_writer',
        displayName: 'Archive Writer',
        avatarUrl: 'https://images.example.com/archive-writer.png',
      },
      language: 'zh',
      rawText: '第一条归档帖子',
      richTextJson: {
        version: 1,
        blocks: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: '第一条归档帖子' }],
          },
        ],
      },
      renderedHtml: '<p>第一条归档帖子</p>',
      rawPayloadJson: {
        id: 'post-001',
        source: 'mock',
      },
      sourceCreatedAt: '2026-03-19T08:00:00.000Z',
      replyCount: 1,
      repostCount: 2,
      quoteCount: 3,
      favoriteCount: 4,
      viewCount: BigInt(5),
      media: [
        {
          mediaType: MediaType.IMAGE,
          sourceUrl: 'https://images.example.com/post-001.png',
          previewUrl: 'https://images.example.com/post-001-preview.png',
          width: 1200,
          height: 675,
        },
      ],
      relations: [
        {
          relationType: RelationType.QUOTE,
          targetXPostId: 'quoted-001',
          targetUrl: 'https://x.com/other/status/quoted-001',
          targetAuthorUsername: 'other_author',
          snapshotJson: {
            text: 'quoted snapshot',
          },
        },
      ],
    });

    expect(archivedPost.bindingId).toBe(binding.id);
    expect(archivedPost.firstCrawlRunId).toBe(run.id);
    expect(archivedPost.mediaItems).toHaveLength(1);
    expect(archivedPost.mediaItems[0]?.sortOrder).toBe(0);
    expect(archivedPost.relations).toHaveLength(1);
    expect(archivedPost.relations[0]?.relationType).toBe(RelationType.QUOTE);

    const detail = await archivesService.getArchivedPostById(archivedPost.id);

    expect(detail?.binding.username).toBe('archive_writer');
    expect(detail?.firstCrawlRun?.id).toBe(run.id);
    expect(detail?.mediaItems[0]?.sourceUrl).toContain('post-001.png');
    expect(detail?.relations[0]?.targetAuthorUsername).toBe('other_author');
  });

  it('lists archived posts by binding and supports lookup by binding plus xPostId', async () => {
    const binding = await createBinding('archive_reader');
    const otherBinding = await createBinding('archive_reader_other');

    await archivesService.createArchivedPost({
      bindingId: binding.id,
      xPostId: 'post-older',
      postUrl: 'https://x.com/archive_reader/status/post-older',
      postType: PostType.REPLY,
      author: {
        username: 'archive_reader',
      },
      rawText: 'older',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-older' },
      sourceCreatedAt: '2026-03-19T07:00:00.000Z',
    });

    const newerPost = await archivesService.createArchivedPost({
      bindingId: binding.id,
      xPostId: 'post-newer',
      postUrl: 'https://x.com/archive_reader/status/post-newer',
      postType: PostType.QUOTE,
      author: {
        username: 'archive_reader',
      },
      rawText: 'newer',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-newer' },
      sourceCreatedAt: '2026-03-19T09:00:00.000Z',
    });
    await archivesService.createArchivedPost({
      bindingId: otherBinding.id,
      xPostId: 'post-newer',
      postUrl: 'https://x.com/archive_reader_other/status/post-newer',
      postType: PostType.POST,
      author: {
        username: 'archive_reader_other',
      },
      rawText: 'same xPostId in another binding',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-newer-other-binding' },
      sourceCreatedAt: '2026-03-19T09:30:00.000Z',
    });

    const page = await archivesService.listArchivedPostsByBinding(binding.id, {
      page: 1,
      pageSize: 1,
    });

    expect(page.total).toBe(2);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.xPostId).toBe('post-newer');

    const found = await archivesService.findByBindingAndXPostId(
      binding.id,
      newerPost.xPostId,
    );

    expect(found?.id).toBe(newerPost.id);
    expect(found?.postType).toBe(PostType.QUOTE);
    await expect(
      archivesService.hasArchivedPost(binding.id, 'post-newer'),
    ).resolves.toBe(true);
    await expect(
      archivesService.hasArchivedPost(binding.id, 'post-missing'),
    ).resolves.toBe(false);
    await expect(
      archivesService.findByBindingAndXPostId(otherBinding.id, 'post-newer'),
    ).resolves.toMatchObject({
      bindingId: otherBinding.id,
    });
  });

  it('filters archived posts by user with keyword, post type and source date range', async () => {
    const binding = await createBinding('archive_search');
    const otherBinding = await createBinding('archive_search_alt');

    await archivesService.createArchivedPost({
      bindingId: binding.id,
      xPostId: 'post-filter-keep',
      postUrl: 'https://x.com/archive_search/status/post-filter-keep',
      postType: PostType.QUOTE,
      author: {
        username: 'archive_search',
        displayName: 'AI Curator',
      },
      rawText: 'AI trend digest for builders',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-filter-keep' },
      sourceCreatedAt: '2026-03-19T09:00:00.000Z',
    });
    await archivesService.createArchivedPost({
      bindingId: binding.id,
      xPostId: 'post-filter-skip-type',
      postUrl: 'https://x.com/archive_search/status/post-filter-skip-type',
      postType: PostType.POST,
      author: {
        username: 'archive_search',
      },
      rawText: 'AI trend but not a quote',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-filter-skip-type' },
      sourceCreatedAt: '2026-03-19T09:30:00.000Z',
    });
    await archivesService.createArchivedPost({
      bindingId: otherBinding.id,
      xPostId: 'post-filter-skip-date',
      postUrl: 'https://x.com/archive_search_alt/status/post-filter-skip-date',
      postType: PostType.QUOTE,
      author: {
        username: 'archive_search_alt',
      },
      rawText: 'AI trend from another day',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-filter-skip-date' },
      sourceCreatedAt: '2026-03-21T09:00:00.000Z',
    });

    const result = await archivesService.listArchivedPostsByUser(
      'archive_owner',
      {
        keyword: 'trend',
        postType: PostType.QUOTE,
        dateFrom: '2026-03-19',
        dateTo: '2026-03-19',
      },
    );

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.xPostId).toBe('post-filter-keep');
  });

  it('filters archived posts by category and tags', async () => {
    const binding = await createBinding('archive_taxonomy');
    const aiCategory = await prisma.category.create({
      data: {
        userId: 'archive_owner',
        name: 'AI',
        slug: 'ai',
        color: '#2563eb',
      },
    });
    const infraCategory = await prisma.category.create({
      data: {
        userId: 'archive_owner',
        name: 'Infra',
        slug: 'infra',
        color: '#0f766e',
      },
    });
    const openAiTag = await prisma.tag.create({
      data: {
        userId: 'archive_owner',
        name: 'OpenAI',
        slug: 'openai',
        color: '#10b981',
      },
    });
    const anthropicTag = await prisma.tag.create({
      data: {
        userId: 'archive_owner',
        name: 'Anthropic',
        slug: 'anthropic',
        color: '#f97316',
      },
    });

    const aiPost = await archivesService.createArchivedPost({
      bindingId: binding.id,
      xPostId: 'post-taxonomy-ai',
      postUrl: 'https://x.com/archive_taxonomy/status/post-taxonomy-ai',
      postType: PostType.POST,
      author: {
        username: 'archive_taxonomy',
      },
      rawText: 'OpenAI shipped another model update',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-taxonomy-ai' },
      sourceCreatedAt: '2026-03-19T10:00:00.000Z',
    });
    const infraPost = await archivesService.createArchivedPost({
      bindingId: binding.id,
      xPostId: 'post-taxonomy-infra',
      postUrl: 'https://x.com/archive_taxonomy/status/post-taxonomy-infra',
      postType: PostType.POST,
      author: {
        username: 'archive_taxonomy',
      },
      rawText: 'Anthropic and GPU infra demand keep rising',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-taxonomy-infra' },
      sourceCreatedAt: '2026-03-19T11:00:00.000Z',
    });

    await prisma.archivedPost.update({
      where: { id: aiPost.id },
      data: {
        primaryCategoryId: aiCategory.id,
      },
    });
    await prisma.archivedPost.update({
      where: { id: infraPost.id },
      data: {
        primaryCategoryId: infraCategory.id,
      },
    });
    await prisma.archivedPostTag.createMany({
      data: [
        {
          archivedPostId: aiPost.id,
          tagId: openAiTag.id,
          source: 'MANUAL',
        },
        {
          archivedPostId: infraPost.id,
          tagId: anthropicTag.id,
          source: 'MANUAL',
        },
      ],
    });

    const byCategory = await archivesService.listArchivedPostsByUser(
      'archive_owner',
      {
        categoryId: aiCategory.id,
      },
    );
    const bySingleTag = await archivesService.listArchivedPostsByUser(
      'archive_owner',
      {
        tagIds: [openAiTag.id],
      },
    );
    const byAnyTag = await archivesService.listArchivedPostsByUser(
      'archive_owner',
      {
        tagIds: [openAiTag.id, anthropicTag.id],
      },
    );

    expect(byCategory.items).toHaveLength(1);
    expect(byCategory.items[0]?.id).toBe(aiPost.id);
    expect(byCategory.items[0]?.primaryCategory?.id).toBe(aiCategory.id);
    expect(byCategory.items[0]?.tagAssignments[0]?.tag.id).toBe(openAiTag.id);

    expect(bySingleTag.items).toHaveLength(1);
    expect(bySingleTag.items[0]?.id).toBe(aiPost.id);

    expect(byAnyTag.items).toHaveLength(2);
  });

  it('updates archive taxonomy with manual category and tags while preserving AI tag sources', async () => {
    const binding = await createBinding('archive_taxonomy_editor');
    const aiCategory = await prisma.category.create({
      data: {
        userId: 'archive_owner',
        name: 'AI Suggested',
        slug: 'ai-suggested',
        color: '#6366f1',
      },
    });
    const manualCategory = await prisma.category.create({
      data: {
        userId: 'archive_owner',
        name: 'Manual Review',
        slug: 'manual-review',
        color: '#2563eb',
      },
    });
    const aiTag = await prisma.tag.create({
      data: {
        userId: 'archive_owner',
        name: 'LLM',
        slug: 'llm',
        color: '#7c3aed',
      },
    });
    const manualTag = await prisma.tag.create({
      data: {
        userId: 'archive_owner',
        name: 'OpenAI',
        slug: 'openai',
        color: '#10b981',
      },
    });

    const archivedPost = await archivesService.createArchivedPost({
      bindingId: binding.id,
      xPostId: 'post-taxonomy-editor',
      postUrl:
        'https://x.com/archive_taxonomy_editor/status/post-taxonomy-editor',
      postType: PostType.POST,
      author: {
        username: 'archive_taxonomy_editor',
      },
      rawText: 'AI generated labels should remain visible after manual edits',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-taxonomy-editor' },
      sourceCreatedAt: '2026-03-19T12:00:00.000Z',
    });

    await prisma.archivedPost.update({
      where: {
        id: archivedPost.id,
      },
      data: {
        primaryCategoryId: aiCategory.id,
        primaryCategorySource: TaxonomySource.AI,
      },
    });
    await prisma.archivedPostTag.create({
      data: {
        archivedPostId: archivedPost.id,
        tagId: aiTag.id,
        source: TaxonomySource.AI,
      },
    });

    const updated = await archivesService.updateArchivedPostTaxonomyForUser(
      'archive_owner',
      archivedPost.id,
      {
        primaryCategoryId: manualCategory.id,
        tagIds: [manualTag.id, aiTag.id],
      },
    );

    expect(updated.primaryCategory?.id).toBe(manualCategory.id);
    expect(updated.primaryCategorySource).toBe(TaxonomySource.MANUAL);
    expect(updated.primaryCategoryLocked).toBe(true);
    expect(updated.tagAssignmentsLocked).toBe(true);
    expect(updated.tagAssignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: TaxonomySource.AI,
          tag: expect.objectContaining({
            id: aiTag.id,
          }),
        }),
        expect.objectContaining({
          source: TaxonomySource.MANUAL,
          tag: expect.objectContaining({
            id: aiTag.id,
          }),
        }),
        expect.objectContaining({
          source: TaxonomySource.MANUAL,
          tag: expect.objectContaining({
            id: manualTag.id,
          }),
        }),
      ]),
    );
  });

  it('locks taxonomy fields even when manual edits clear the current values', async () => {
    const binding = await createBinding('archive_taxonomy_clear');
    const aiCategory = await prisma.category.create({
      data: {
        userId: 'archive_owner',
        name: 'Signals',
        slug: 'signals',
        color: '#0891b2',
      },
    });
    const aiTag = await prisma.tag.create({
      data: {
        userId: 'archive_owner',
        name: 'Trend',
        slug: 'trend',
        color: '#2563eb',
      },
    });

    const archivedPost = await archivesService.createArchivedPost({
      bindingId: binding.id,
      xPostId: 'post-taxonomy-clear',
      postUrl:
        'https://x.com/archive_taxonomy_clear/status/post-taxonomy-clear',
      postType: PostType.POST,
      author: {
        username: 'archive_taxonomy_clear',
      },
      rawText: 'Manual clear should still prevent future AI overwrites',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-taxonomy-clear' },
      sourceCreatedAt: '2026-03-19T13:00:00.000Z',
    });

    await prisma.archivedPost.update({
      where: {
        id: archivedPost.id,
      },
      data: {
        primaryCategoryId: aiCategory.id,
        primaryCategorySource: TaxonomySource.AI,
      },
    });
    await prisma.archivedPostTag.create({
      data: {
        archivedPostId: archivedPost.id,
        tagId: aiTag.id,
        source: TaxonomySource.AI,
      },
    });

    const updated = await archivesService.updateArchivedPostTaxonomyForUser(
      'archive_owner',
      archivedPost.id,
      {
        primaryCategoryId: null,
        tagIds: [],
      },
    );

    expect(updated.primaryCategory).toBeNull();
    expect(updated.primaryCategorySource).toBeNull();
    expect(updated.primaryCategoryLocked).toBe(true);
    expect(updated.tagAssignmentsLocked).toBe(true);
    expect(updated.tagAssignments).toEqual([
      expect.objectContaining({
        source: TaxonomySource.AI,
        tag: expect.objectContaining({
          id: aiTag.id,
        }),
      }),
    ]);
  });

  it('falls back to the existing archive when concurrent writes hit the unique constraint', async () => {
    const binding = await createBinding('archive_conflict');
    const input = {
      bindingId: binding.id,
      xPostId: 'post-conflict',
      postUrl: 'https://x.com/archive_conflict/status/post-conflict',
      postType: PostType.POST,
      author: {
        username: 'archive_conflict',
      },
      rawText: 'conflict post',
      richTextJson: { version: 1, blocks: [] },
      rawPayloadJson: { id: 'post-conflict' },
      sourceCreatedAt: '2026-03-19T10:00:00.000Z',
    } as const;

    const [firstWrite, secondWrite] = await Promise.all([
      archivesService.createArchivedPostWithConflictFallback(input),
      archivesService.createArchivedPostWithConflictFallback(input),
    ]);

    expect(firstWrite.archivedPost.id).toBe(secondWrite.archivedPost.id);
    expect([firstWrite.created, secondWrite.created].sort()).toEqual([
      false,
      true,
    ]);

    const storedPosts = await prisma.archivedPost.findMany({
      where: {
        bindingId: binding.id,
        xPostId: input.xPostId,
      },
    });

    expect(storedPosts).toHaveLength(1);
  });

  async function createBinding(username: string) {
    return prisma.xAccountBinding.create({
      data: {
        userId: 'archive_owner',
        xUserId: `x-${username}`,
        username,
        displayName: `${username} display`,
        status: BindingStatus.ACTIVE,
        credentialSource: CredentialSource.WEB_LOGIN,
        authPayloadEncrypted: 'encrypted-payload',
        lastValidatedAt: new Date('2026-03-19T00:00:00.000Z'),
        crawlEnabled: true,
        crawlIntervalMinutes: 60,
        nextCrawlAt: new Date('2026-03-19T10:00:00.000Z'),
        crawlJob: {
          create: {
            enabled: true,
            intervalMinutes: 60,
            nextRunAt: new Date('2026-03-19T10:00:00.000Z'),
          },
        },
      },
      include: {
        crawlJob: true,
      },
    });
  }
});
