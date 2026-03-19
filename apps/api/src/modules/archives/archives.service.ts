import {
  type ArchiveStatus,
  type MediaType,
  type PostType,
  type Prisma,
  type RelationType,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateArchivedPostMediaInput = {
  durationMs?: number;
  height?: number;
  mediaType: MediaType;
  previewUrl?: string;
  sourceUrl: string;
  width?: number;
};

type CreateArchivedPostRelationInput = {
  relationType: RelationType;
  snapshotJson?: Prisma.InputJsonValue;
  targetAuthorUsername?: string;
  targetUrl?: string;
  targetXPostId?: string;
};

export type CreateArchivedPostInput = {
  archiveStatus?: ArchiveStatus;
  author: {
    avatarUrl?: string;
    displayName?: string;
    username: string;
    xUserId?: string;
  };
  bindingId: string;
  favoriteCount?: number;
  firstCrawlRunId?: string | null;
  language?: string;
  media?: CreateArchivedPostMediaInput[];
  postType: PostType;
  postUrl: string;
  quoteCount?: number;
  rawPayloadJson: Prisma.InputJsonValue;
  rawText: string;
  relations?: CreateArchivedPostRelationInput[];
  renderedHtml?: string | null;
  replyCount?: number;
  repostCount?: number;
  richTextJson: Prisma.InputJsonValue;
  sourceCreatedAt: Date | string;
  viewCount?: bigint | number | string;
  xPostId: string;
};

type ListArchivedPostsOptions = {
  page?: number;
  pageSize?: number;
};

const archivedPostDetailArgs = {
  include: {
    binding: true,
    firstCrawlRun: true,
    mediaItems: {
      orderBy: {
        sortOrder: 'asc',
      },
    },
    relations: true,
  },
} satisfies Prisma.ArchivedPostDefaultArgs;

export type ArchivedPostDetail = Prisma.ArchivedPostGetPayload<
  typeof archivedPostDetailArgs
>;

@Injectable()
export class ArchivesService {
  constructor(private readonly prisma: PrismaService) {}

  createArchivedPost(
    input: CreateArchivedPostInput,
  ): Promise<ArchivedPostDetail> {
    return this.prisma.archivedPost.create({
      data: {
        bindingId: input.bindingId,
        firstCrawlRunId: input.firstCrawlRunId ?? null,
        xPostId: input.xPostId,
        postUrl: input.postUrl,
        postType: input.postType,
        archiveStatus: input.archiveStatus,
        authorXUserId: input.author.xUserId,
        authorUsername: input.author.username,
        authorDisplayName: input.author.displayName,
        authorAvatarUrl: input.author.avatarUrl,
        language: input.language,
        rawText: input.rawText,
        richTextJson: input.richTextJson,
        renderedHtml: input.renderedHtml ?? null,
        rawPayloadJson: input.rawPayloadJson,
        sourceCreatedAt: new Date(input.sourceCreatedAt),
        replyCount: input.replyCount,
        repostCount: input.repostCount,
        quoteCount: input.quoteCount,
        favoriteCount: input.favoriteCount,
        viewCount: this.normalizeViewCount(input.viewCount),
        mediaItems:
          input.media && input.media.length > 0
            ? {
                create: input.media.map((item, index) => ({
                  mediaType: item.mediaType,
                  sourceUrl: item.sourceUrl,
                  previewUrl: item.previewUrl,
                  width: item.width,
                  height: item.height,
                  durationMs: item.durationMs,
                  sortOrder: index,
                })),
              }
            : undefined,
        relations:
          input.relations && input.relations.length > 0
            ? {
                create: input.relations.map((item) => ({
                  relationType: item.relationType,
                  targetXPostId: item.targetXPostId,
                  targetUrl: item.targetUrl,
                  targetAuthorUsername: item.targetAuthorUsername,
                  snapshotJson: item.snapshotJson,
                })),
              }
            : undefined,
      },
      ...archivedPostDetailArgs,
    });
  }

  findByBindingAndXPostId(
    bindingId: string,
    xPostId: string,
  ): Promise<ArchivedPostDetail | null> {
    return this.prisma.archivedPost.findUnique({
      where: {
        bindingId_xPostId: {
          bindingId,
          xPostId,
        },
      },
      ...archivedPostDetailArgs,
    });
  }

  async hasArchivedPost(bindingId: string, xPostId: string) {
    const archivedPost = await this.prisma.archivedPost.findUnique({
      where: {
        bindingId_xPostId: {
          bindingId,
          xPostId,
        },
      },
      select: {
        id: true,
      },
    });

    return archivedPost !== null;
  }

  getArchivedPostById(id: string): Promise<ArchivedPostDetail | null> {
    return this.prisma.archivedPost.findUnique({
      where: { id },
      ...archivedPostDetailArgs,
    });
  }

  async listArchivedPostsByBinding(
    bindingId: string,
    options: ListArchivedPostsOptions = {},
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.archivedPost.findMany({
        where: { bindingId },
        include: {
          mediaItems: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          relations: true,
        },
        orderBy: {
          archivedAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.archivedPost.count({
        where: { bindingId },
      }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
    };
  }

  private normalizeViewCount(value: CreateArchivedPostInput['viewCount']) {
    if (value === undefined) {
      return undefined;
    }

    return typeof value === 'string' ? BigInt(value) : value;
  }
}
