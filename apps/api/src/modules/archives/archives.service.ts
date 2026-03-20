import {
  type PostType,
  Prisma,
  type ArchiveStatus,
  type MediaType,
  type RelationType,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import type { RealBrowserCredentialPayload } from '../crawler/x-browser.types';
import { XBrowserAutomationService } from '../crawler/x-browser-automation.service';
import {
  matchResolvedVideoMedia,
  needsResolvedVideoSource,
  type ResolvedVideoMediaSource,
} from '../crawler/x-video-media';
import { PrismaService } from '../prisma/prisma.service';
import {
  type RichTextDocument,
  type RichTextMediaBlock,
} from './rich-text.converter';
import { renderRichTextToHtml } from './rich-text.renderer';

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
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
  postType?: PostType;
  tagIds?: string[];
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
    primaryCategory: true,
    relations: true,
    tagAssignments: {
      include: {
        tag: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    },
  },
} satisfies Prisma.ArchivedPostDefaultArgs;

export type ArchivedPostDetail = Prisma.ArchivedPostGetPayload<
  typeof archivedPostDetailArgs
>;

export type CreateArchivedPostResult = {
  archivedPost: ArchivedPostDetail;
  created: boolean;
};

@Injectable()
export class ArchivesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialCryptoService: CredentialCryptoService,
    private readonly xBrowserAutomationService: XBrowserAutomationService,
  ) {}

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

  async createArchivedPostWithConflictFallback(
    input: CreateArchivedPostInput,
  ): Promise<CreateArchivedPostResult> {
    try {
      const archivedPost = await this.createArchivedPost(input);

      return {
        archivedPost,
        created: true,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const archivedPost = await this.findByBindingAndXPostId(
          input.bindingId,
          input.xPostId,
        );

        if (archivedPost) {
          return {
            archivedPost,
            created: false,
          };
        }
      }

      throw error;
    }
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

  async getArchivedPostDetailForUser(userId: string, archivedPostId: string) {
    const archivedPost = await this.prisma.archivedPost.findFirst({
      where: {
        id: archivedPostId,
        binding: {
          userId,
        },
      },
      ...archivedPostDetailArgs,
    });

    if (!archivedPost) {
      throw new NotFoundException('Archived post not found');
    }

    return this.repairEphemeralVideoMediaSources(archivedPost);
  }

  async listArchivedPostsByBinding(
    bindingId: string,
    options: ListArchivedPostsOptions = {},
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.buildArchivedPostWhere({
      bindingId,
      categoryId: options.categoryId,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      keyword: options.keyword,
      postType: options.postType,
      tagIds: options.tagIds,
    });
    const [items, total] = await this.prisma.$transaction([
      this.prisma.archivedPost.findMany({
        where,
        include: {
          mediaItems: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          primaryCategory: true,
          relations: true,
          tagAssignments: {
            include: {
              tag: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          archivedAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.archivedPost.count({
        where,
      }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
    };
  }

  async listArchivedPostsByUser(
    userId: string,
    options: ListArchivedPostsOptions = {},
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.buildArchivedPostWhere({
      userId,
      categoryId: options.categoryId,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      keyword: options.keyword,
      postType: options.postType,
      tagIds: options.tagIds,
    });
    const [items, total] = await this.prisma.$transaction([
      this.prisma.archivedPost.findMany({
        where,
        include: {
          binding: true,
          mediaItems: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          primaryCategory: true,
          tagAssignments: {
            include: {
              tag: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          archivedAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.archivedPost.count({
        where,
      }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
    };
  }

  private async repairEphemeralVideoMediaSources(
    archivedPost: ArchivedPostDetail,
  ) {
    const videoItems = archivedPost.mediaItems.filter(
      (item) =>
        item.mediaType === 'VIDEO' && needsResolvedVideoSource(item.sourceUrl),
    );

    if (videoItems.length === 0) {
      return archivedPost;
    }

    const credentialPayload = this.parseRealBrowserCredentialPayload(
      archivedPost.binding.authPayloadEncrypted,
    );

    if (!credentialPayload) {
      return archivedPost;
    }

    const resolvedMedia = await this.xBrowserAutomationService
      .resolvePostVideoMedia(
        credentialPayload,
        archivedPost.postUrl,
        archivedPost.xPostId,
      )
      .catch(() => [] as ResolvedVideoMediaSource[]);

    if (resolvedMedia.length === 0) {
      return archivedPost;
    }

    const repairedMediaItems = matchResolvedVideoMedia(
      archivedPost.mediaItems,
      resolvedMedia,
    );
    const changedMediaItems = repairedMediaItems.filter((item, index) => {
      const original = archivedPost.mediaItems[index];

      return (
        original &&
        (original.sourceUrl !== item.sourceUrl ||
          original.previewUrl !== item.previewUrl)
      );
    });

    if (changedMediaItems.length === 0) {
      return archivedPost;
    }

    const repairedRichTextJson = this.repairRichTextDocumentMediaSources(
      archivedPost.richTextJson,
      resolvedMedia,
    );
    const renderedHtml =
      repairedRichTextJson !== null
        ? renderRichTextToHtml(repairedRichTextJson)
        : archivedPost.renderedHtml;

    const archivedPostUpdateData: Prisma.ArchivedPostUpdateInput = {
      renderedHtml,
    };

    if (repairedRichTextJson !== null) {
      archivedPostUpdateData.richTextJson =
        repairedRichTextJson as Prisma.InputJsonValue;
    }

    await this.prisma.$transaction([
      ...changedMediaItems.map((item) =>
        this.prisma.archivedPostMedia.update({
          where: {
            id: item.id,
          },
          data: {
            sourceUrl: item.sourceUrl,
            previewUrl: item.previewUrl,
            width: item.width,
            height: item.height,
          },
        }),
      ),
      this.prisma.archivedPost.update({
        where: {
          id: archivedPost.id,
        },
        data: archivedPostUpdateData,
      }),
    ]);

    return {
      ...archivedPost,
      mediaItems: repairedMediaItems,
      richTextJson:
        repairedRichTextJson === null
          ? archivedPost.richTextJson
          : repairedRichTextJson,
      renderedHtml,
    };
  }

  private parseRealBrowserCredentialPayload(authPayloadEncrypted: string) {
    try {
      const decryptedPayload =
        this.credentialCryptoService.decrypt(authPayloadEncrypted);

      if (!decryptedPayload.trim()) {
        return null;
      }

      const parsed = JSON.parse(
        decryptedPayload,
      ) as Partial<RealBrowserCredentialPayload>;

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        parsed.adapter !== 'real' ||
        !Array.isArray(parsed.cookies)
      ) {
        return null;
      }

      return parsed as RealBrowserCredentialPayload;
    } catch {
      return null;
    }
  }

  private repairRichTextDocumentMediaSources(
    richTextJson: Prisma.JsonValue,
    resolvedMedia: ResolvedVideoMediaSource[],
  ): RichTextDocument | null {
    if (
      typeof richTextJson !== 'object' ||
      richTextJson === null ||
      !('version' in richTextJson) ||
      !('blocks' in richTextJson) ||
      !Array.isArray((richTextJson as RichTextDocument).blocks)
    ) {
      return null;
    }

    const document = richTextJson as RichTextDocument;
    const mediaBlocks = document.blocks.filter(
      (block): block is RichTextMediaBlock => block.type === 'media',
    );
    const repairedMediaBlocks = matchResolvedVideoMedia(
      mediaBlocks,
      resolvedMedia,
    );
    let mediaIndex = 0;
    let changed = false;

    const blocks = document.blocks.map((block) => {
      if (block.type !== 'media') {
        return block;
      }

      const repairedBlock = repairedMediaBlocks[mediaIndex] ?? block;

      if (
        repairedBlock.sourceUrl !== block.sourceUrl ||
        repairedBlock.previewUrl !== block.previewUrl
      ) {
        changed = true;
      }

      mediaIndex += 1;
      return repairedBlock;
    });

    if (!changed) {
      return document;
    }

    return {
      ...document,
      blocks,
    };
  }

  private normalizeViewCount(value: CreateArchivedPostInput['viewCount']) {
    if (value === undefined) {
      return undefined;
    }

    return typeof value === 'string' ? BigInt(value) : value;
  }

  private buildArchivedPostWhere(input: {
    bindingId?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
    postType?: PostType;
    tagIds?: string[];
    userId?: string;
  }): Prisma.ArchivedPostWhereInput {
    const where: Prisma.ArchivedPostWhereInput = {};

    if (input.bindingId) {
      where.bindingId = input.bindingId;
    }

    if (input.userId) {
      where.binding = {
        userId: input.userId,
      };
    }

    if (input.postType) {
      where.postType = input.postType;
    }

    if (input.categoryId) {
      where.primaryCategoryId = input.categoryId;
    }

    if (input.tagIds && input.tagIds.length > 0) {
      where.tagAssignments = {
        some: {
          tagId: {
            in: input.tagIds,
          },
        },
      };
    }

    const sourceCreatedAt = this.buildSourceCreatedAtFilter(
      input.dateFrom,
      input.dateTo,
    );

    if (sourceCreatedAt) {
      where.sourceCreatedAt = sourceCreatedAt;
    }

    if (input.keyword) {
      where.OR = [
        {
          rawText: {
            contains: input.keyword,
            mode: 'insensitive',
          },
        },
        {
          authorUsername: {
            contains: input.keyword,
            mode: 'insensitive',
          },
        },
        {
          authorDisplayName: {
            contains: input.keyword,
            mode: 'insensitive',
          },
        },
        {
          xPostId: {
            contains: input.keyword,
            mode: 'insensitive',
          },
        },
        {
          binding: {
            username: {
              contains: input.keyword,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    return where;
  }

  private buildSourceCreatedAtFilter(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) {
      return undefined;
    }

    const gte = dateFrom
      ? this.parseArchiveFilterDate(dateFrom, 'start')
      : undefined;
    const lte = dateTo ? this.parseArchiveFilterDate(dateTo, 'end') : undefined;

    if (gte && lte && gte > lte) {
      throw new BadRequestException('Archive dateFrom cannot be after dateTo');
    }

    return {
      gte,
      lte,
    };
  }

  private parseArchiveFilterDate(value: string, boundary: 'start' | 'end') {
    const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}${boundary === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z'}`
      : value;
    const parsedDate = new Date(normalizedValue);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(`Invalid archive date filter: ${value}`);
    }

    return parsedDate;
  }
}
