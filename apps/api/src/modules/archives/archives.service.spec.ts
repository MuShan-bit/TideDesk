import {
  BindingStatus,
  CrawlRunStatus,
  CrawlTriggerType,
  CredentialSource,
  MediaType,
  PostType,
  RelationType,
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
