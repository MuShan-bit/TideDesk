import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { ListTaxonomyQueryDto } from './dto/list-taxonomy-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { normalizeTaxonomySlug } from './taxonomy-slug';

type TaxonomyListOptions = Pick<
  ListTaxonomyQueryDto,
  'includeInactive' | 'keyword'
>;

export type EnsureTagCandidate = {
  color?: string | null;
  name: string;
  slug?: string | null;
};

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories(userId: string, options: TaxonomyListOptions = {}) {
    return this.prisma.category.findMany({
      where: this.buildCategoryWhere(userId, options),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(userId: string, dto: CreateCategoryDto) {
    const sortOrder = await this.resolveNextCategorySortOrder(
      userId,
      dto.sortOrder,
    );

    try {
      return await this.prisma.category.create({
        data: {
          userId,
          name: dto.name,
          slug: normalizeTaxonomySlug(dto.slug ?? dto.name),
          description: dto.description ?? null,
          color: dto.color ?? null,
          isActive: dto.isActive ?? true,
          sortOrder,
        },
      });
    } catch (error) {
      this.rethrowTaxonomyConflict(error, 'Category');
    }
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
  ) {
    const category = await this.findCategoryOrThrow(userId, categoryId);

    this.assertEditable(category.isSystem, 'Category');

    const data: Prisma.CategoryUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.slug !== undefined) {
      data.slug = normalizeTaxonomySlug(dto.slug);
    }

    if (dto.description !== undefined) {
      data.description = dto.description ?? null;
    }

    if (dto.color !== undefined) {
      data.color = dto.color ?? null;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    if (Object.keys(data).length === 0) {
      return category;
    }

    try {
      return await this.prisma.category.update({
        where: { id: category.id },
        data,
      });
    } catch (error) {
      this.rethrowTaxonomyConflict(error, 'Category');
    }
  }

  async disableCategory(userId: string, categoryId: string) {
    const category = await this.findCategoryOrThrow(userId, categoryId);

    this.assertEditable(category.isSystem, 'Category');

    return this.prisma.category.update({
      where: { id: category.id },
      data: {
        isActive: false,
      },
    });
  }

  listTags(userId: string, options: TaxonomyListOptions = {}) {
    return this.prisma.tag.findMany({
      where: this.buildTagWhere(userId, options),
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createTag(userId: string, dto: CreateTagDto) {
    try {
      return await this.prisma.tag.create({
        data: {
          userId,
          name: dto.name,
          slug: normalizeTaxonomySlug(dto.slug ?? dto.name),
          color: dto.color ?? null,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.rethrowTaxonomyConflict(error, 'Tag');
    }
  }

  async updateTag(userId: string, tagId: string, dto: UpdateTagDto) {
    const tag = await this.findTagOrThrow(userId, tagId);

    this.assertEditable(tag.isSystem, 'Tag');

    const data: Prisma.TagUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.slug !== undefined) {
      data.slug = normalizeTaxonomySlug(dto.slug);
    }

    if (dto.color !== undefined) {
      data.color = dto.color ?? null;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (Object.keys(data).length === 0) {
      return tag;
    }

    try {
      return await this.prisma.tag.update({
        where: { id: tag.id },
        data,
      });
    } catch (error) {
      this.rethrowTaxonomyConflict(error, 'Tag');
    }
  }

  async disableTag(userId: string, tagId: string) {
    const tag = await this.findTagOrThrow(userId, tagId);

    this.assertEditable(tag.isSystem, 'Tag');

    return this.prisma.tag.update({
      where: { id: tag.id },
      data: {
        isActive: false,
      },
    });
  }

  async ensureTagsForUser(userId: string, candidates: EnsureTagCandidate[]) {
    const normalizedCandidates = candidates
      .map((candidate) => this.normalizeEnsureTagCandidate(candidate))
      .filter(
        (
          candidate,
        ): candidate is {
          color: string | null;
          name: string;
          slug: string;
        } => candidate !== null,
      );

    if (normalizedCandidates.length === 0) {
      return [];
    }

    const uniqueSlugs = [
      ...new Set(normalizedCandidates.map((item) => item.slug)),
    ];
    const tagsBySlug = new Map(
      (
        await this.prisma.tag.findMany({
          where: {
            userId,
            slug: {
              in: uniqueSlugs,
            },
          },
        })
      ).map((tag) => [tag.slug, tag] as const),
    );
    const resolvedTags = [];

    for (const candidate of normalizedCandidates) {
      const existingTag = tagsBySlug.get(candidate.slug);

      if (existingTag) {
        resolvedTags.push(existingTag);
        continue;
      }

      try {
        const createdTag = await this.prisma.tag.create({
          data: {
            userId,
            name: candidate.name,
            slug: candidate.slug,
            color: candidate.color,
            isActive: true,
          },
        });

        tagsBySlug.set(createdTag.slug, createdTag);
        resolvedTags.push(createdTag);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const concurrentTag = await this.prisma.tag.findFirst({
            where: {
              userId,
              slug: candidate.slug,
            },
          });

          if (concurrentTag) {
            tagsBySlug.set(concurrentTag.slug, concurrentTag);
            resolvedTags.push(concurrentTag);
            continue;
          }
        }

        this.rethrowTaxonomyConflict(error, 'Tag');
      }
    }

    return resolvedTags;
  }

  private buildCategoryWhere(
    userId: string,
    options: TaxonomyListOptions,
  ): Prisma.CategoryWhereInput {
    return {
      userId,
      ...(options.includeInactive ? {} : { isActive: true }),
      ...(options.keyword
        ? {
            OR: [
              {
                name: {
                  contains: options.keyword,
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: options.keyword,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: options.keyword,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
  }

  private buildTagWhere(
    userId: string,
    options: TaxonomyListOptions,
  ): Prisma.TagWhereInput {
    return {
      userId,
      ...(options.includeInactive ? {} : { isActive: true }),
      ...(options.keyword
        ? {
            OR: [
              {
                name: {
                  contains: options.keyword,
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: options.keyword,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
  }

  private async resolveNextCategorySortOrder(
    userId: string,
    providedSortOrder?: number,
  ) {
    if (providedSortOrder !== undefined) {
      return providedSortOrder;
    }

    const aggregate = await this.prisma.category.aggregate({
      where: { userId },
      _max: {
        sortOrder: true,
      },
    });

    return (aggregate._max.sortOrder ?? -1) + 1;
  }

  private async findCategoryOrThrow(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async findTagOrThrow(userId: string, tagId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: {
        id: tagId,
        userId,
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  private assertEditable(isSystem: boolean, entityName: string) {
    if (isSystem) {
      throw new BadRequestException(`${entityName} is system managed`);
    }
  }

  private normalizeEnsureTagCandidate(candidate: EnsureTagCandidate) {
    const name = candidate.name.trim() || candidate.slug?.trim() || '';

    if (!name) {
      return null;
    }

    return {
      name,
      slug: normalizeTaxonomySlug(candidate.slug ?? name),
      color: candidate.color ?? null,
    };
  }

  private rethrowTaxonomyConflict(error: unknown, entityName: string): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(
        `${entityName} slug already exists for current user`,
      );
    }

    throw error;
  }
}
