import { CrawlMode, Prisma } from '@prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_POST_LIMIT = 50;
const MAX_POST_LIMIT = 200;

const aggregatedArchivedPostInclude = {
  binding: {
    select: {
      id: true,
      username: true,
      displayName: true,
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
  archiveOccurrences: {
    include: {
      crawlProfile: {
        select: {
          id: true,
          mode: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.ArchivedPostInclude;

type AggregatedArchivedPost = Prisma.ArchivedPostGetPayload<{
  include: typeof aggregatedArchivedPostInclude;
}>;

type AggregateReportPeriodInput = {
  bindingIds?: string[];
  categoryIds?: string[];
  modes?: CrawlMode[];
  periodEnd: Date | string;
  periodStart: Date | string;
  postLimit?: number;
  tagIds?: string[];
};

type AggregateMode = CrawlMode | 'UNKNOWN';

type AggregateBindingItem = {
  bindingId: string;
  count: number;
  displayName: string | null;
  username: string;
};

type AggregateCategoryItem = {
  categoryId: string | null;
  count: number;
  name: string;
  slug: string | null;
};

type AggregateTagItem = {
  count: number;
  name: string;
  slug: string;
  tagId: string;
};

type AggregatePostItem = {
  archivedPostId: string;
  authorDisplayName: string | null;
  authorUsername: string;
  binding: {
    bindingId: string;
    displayName: string | null;
    username: string;
  };
  modes: AggregateMode[];
  postUrl: string;
  primaryCategory: {
    categoryId: string;
    name: string;
    slug: string;
  } | null;
  rawText: string;
  sourceCreatedAt: Date;
  tags: Array<{
    name: string;
    slug: string;
    tagId: string;
  }>;
  xPostId: string;
};

export type ReportPeriodAggregate = {
  bindings: AggregateBindingItem[];
  categories: AggregateCategoryItem[];
  filters: {
    bindingIds: string[];
    categoryIds: string[];
    modes: CrawlMode[];
    tagIds: string[];
  };
  modes: Array<{
    count: number;
    mode: AggregateMode;
  }>;
  periodEnd: Date;
  periodStart: Date;
  posts: AggregatePostItem[];
  tags: AggregateTagItem[];
  totalPosts: number;
};

@Injectable()
export class ReportAggregationService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregatePeriodForUser(
    userId: string,
    input: AggregateReportPeriodInput,
  ): Promise<ReportPeriodAggregate> {
    const periodStart = this.parseRequiredDate(
      input.periodStart,
      'Report period start is invalid',
    );
    const periodEnd = this.parseRequiredDate(
      input.periodEnd,
      'Report period end is invalid',
    );

    if (periodEnd <= periodStart) {
      throw new BadRequestException(
        'Report period end must be after period start',
      );
    }

    const bindingIds = this.normalizeIdFilter(input.bindingIds);
    const categoryIds = this.normalizeIdFilter(input.categoryIds);
    const tagIds = this.normalizeIdFilter(input.tagIds);
    const modes = this.normalizeModes(input.modes);
    const postLimit = this.normalizePostLimit(input.postLimit);

    await Promise.all([
      this.ensureBindingsAvailable(userId, bindingIds),
      this.ensureCategoriesAvailable(userId, categoryIds),
      this.ensureTagsAvailable(userId, tagIds),
    ]);

    const posts = await this.prisma.archivedPost.findMany({
      where: this.buildArchiveWhere({
        userId,
        periodStart,
        periodEnd,
        bindingIds,
        categoryIds,
        tagIds,
        modes,
      }),
      orderBy: [{ sourceCreatedAt: 'desc' }, { createdAt: 'desc' }],
      include: aggregatedArchivedPostInclude,
    });

    return {
      totalPosts: posts.length,
      periodStart,
      periodEnd,
      filters: {
        bindingIds,
        categoryIds,
        tagIds,
        modes,
      },
      bindings: this.buildBindingBreakdown(posts),
      modes: this.buildModeBreakdown(posts),
      categories: this.buildCategoryBreakdown(posts),
      tags: this.buildTagBreakdown(posts),
      posts: this.buildPostPreview(posts).slice(0, postLimit),
    };
  }

  private buildArchiveWhere(input: {
    bindingIds: string[];
    categoryIds: string[];
    modes: CrawlMode[];
    periodEnd: Date;
    periodStart: Date;
    tagIds: string[];
    userId: string;
  }): Prisma.ArchivedPostWhereInput {
    const where: Prisma.ArchivedPostWhereInput = {
      binding: {
        userId: input.userId,
      },
      sourceCreatedAt: {
        gte: input.periodStart,
        lt: input.periodEnd,
      },
    };

    if (input.bindingIds.length > 0) {
      where.bindingId = {
        in: input.bindingIds,
      };
    }

    if (input.categoryIds.length > 0) {
      where.primaryCategoryId = {
        in: input.categoryIds,
      };
    }

    if (input.tagIds.length > 0) {
      where.tagAssignments = {
        some: {
          tagId: {
            in: input.tagIds,
          },
        },
      };
    }

    if (input.modes.length > 0) {
      where.archiveOccurrences = {
        some: {
          crawlProfile: {
            is: {
              mode: {
                in: input.modes,
              },
            },
          },
        },
      };
    }

    return where;
  }

  private buildBindingBreakdown(posts: AggregatedArchivedPost[]) {
    const bindingCounts = new Map<string, AggregateBindingItem>();

    for (const post of posts) {
      const existing = bindingCounts.get(post.bindingId);

      if (existing) {
        existing.count += 1;
        continue;
      }

      bindingCounts.set(post.bindingId, {
        bindingId: post.bindingId,
        username: post.binding.username,
        displayName: post.binding.displayName,
        count: 1,
      });
    }

    return [...bindingCounts.values()].sort(
      (left, right) =>
        right.count - left.count ||
        left.username.localeCompare(right.username, 'en'),
    );
  }

  private buildModeBreakdown(posts: AggregatedArchivedPost[]) {
    const modeCounts = new Map<AggregateMode, number>();

    for (const post of posts) {
      const modes = this.extractPostModes(post);

      for (const mode of modes) {
        modeCounts.set(mode, (modeCounts.get(mode) ?? 0) + 1);
      }
    }

    return [...modeCounts.entries()]
      .map(([mode, count]) => ({
        mode,
        count,
      }))
      .sort(
        (left, right) =>
          right.count - left.count || left.mode.localeCompare(right.mode, 'en'),
      );
  }

  private buildCategoryBreakdown(posts: AggregatedArchivedPost[]) {
    const categoryCounts = new Map<string, AggregateCategoryItem>();

    for (const post of posts) {
      const key = post.primaryCategory?.id ?? 'uncategorized';
      const existing = categoryCounts.get(key);

      if (existing) {
        existing.count += 1;
        continue;
      }

      categoryCounts.set(key, {
        categoryId: post.primaryCategory?.id ?? null,
        name: post.primaryCategory?.name ?? 'Uncategorized',
        slug: post.primaryCategory?.slug ?? null,
        count: 1,
      });
    }

    return [...categoryCounts.values()].sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name, 'en'),
    );
  }

  private buildTagBreakdown(posts: AggregatedArchivedPost[]) {
    const tagCounts = new Map<string, AggregateTagItem>();

    for (const post of posts) {
      const uniqueTags = new Map(
        post.tagAssignments.map((assignment) => [
          assignment.tagId,
          assignment.tag,
        ]),
      );

      for (const [tagId, tag] of uniqueTags.entries()) {
        const existing = tagCounts.get(tagId);

        if (existing) {
          existing.count += 1;
          continue;
        }

        tagCounts.set(tagId, {
          tagId,
          name: tag.name,
          slug: tag.slug,
          count: 1,
        });
      }
    }

    return [...tagCounts.values()].sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name, 'en'),
    );
  }

  private buildPostPreview(posts: AggregatedArchivedPost[]) {
    return posts.map((post) => ({
      archivedPostId: post.id,
      xPostId: post.xPostId,
      postUrl: post.postUrl,
      rawText: post.rawText,
      authorUsername: post.authorUsername,
      authorDisplayName: post.authorDisplayName,
      sourceCreatedAt: post.sourceCreatedAt,
      binding: {
        bindingId: post.bindingId,
        username: post.binding.username,
        displayName: post.binding.displayName,
      },
      primaryCategory: post.primaryCategory
        ? {
            categoryId: post.primaryCategory.id,
            name: post.primaryCategory.name,
            slug: post.primaryCategory.slug,
          }
        : null,
      tags: [...new Map(
        post.tagAssignments.map((assignment) => [
          assignment.tagId,
          {
            tagId: assignment.tag.id,
            name: assignment.tag.name,
            slug: assignment.tag.slug,
          },
        ]),
      ).values()],
      modes: this.extractPostModes(post),
    }));
  }

  private extractPostModes(post: AggregatedArchivedPost) {
    const modes = new Set<AggregateMode>();

    for (const occurrence of post.archiveOccurrences) {
      modes.add(occurrence.crawlProfile?.mode ?? 'UNKNOWN');
    }

    if (modes.size === 0) {
      modes.add('UNKNOWN');
    }

    return [...modes].sort();
  }

  private normalizeIdFilter(values?: string[]) {
    if (!values) {
      return [];
    }

    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private normalizeModes(values?: CrawlMode[]) {
    if (!values) {
      return [];
    }

    return [...new Set(values)];
  }

  private normalizePostLimit(value?: number) {
    if (!value || value < 1) {
      return DEFAULT_POST_LIMIT;
    }

    return Math.min(Math.floor(value), MAX_POST_LIMIT);
  }

  private parseRequiredDate(value: Date | string, message: string) {
    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(message);
    }

    return parsedDate;
  }

  private async ensureBindingsAvailable(userId: string, bindingIds: string[]) {
    if (bindingIds.length === 0) {
      return;
    }

    const count = await this.prisma.xAccountBinding.count({
      where: {
        id: {
          in: bindingIds,
        },
        userId,
      },
    });

    if (count !== bindingIds.length) {
      throw new BadRequestException('One or more bindings are unavailable');
    }
  }

  private async ensureCategoriesAvailable(userId: string, categoryIds: string[]) {
    if (categoryIds.length === 0) {
      return;
    }

    const count = await this.prisma.category.count({
      where: {
        id: {
          in: categoryIds,
        },
        userId,
      },
    });

    if (count !== categoryIds.length) {
      throw new BadRequestException('One or more categories are unavailable');
    }
  }

  private async ensureTagsAvailable(userId: string, tagIds: string[]) {
    if (tagIds.length === 0) {
      return;
    }

    const count = await this.prisma.tag.count({
      where: {
        id: {
          in: tagIds,
        },
        userId,
      },
    });

    if (count !== tagIds.length) {
      throw new BadRequestException('One or more tags are unavailable');
    }
  }
}
