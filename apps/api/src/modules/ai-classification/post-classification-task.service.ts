import {
  AITaskStatus,
  AITaskType,
  Prisma,
  RelationType,
  type MediaType,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { type AiGatewayResult } from '../ai-gateway/ai-gateway.types';
import {
  ArchivesService,
  type ArchivedPostDetail,
} from '../archives/archives.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { PostClassificationService } from './post-classification.service';

const POST_CLASSIFICATION_TASK_TARGET_TYPE = 'ARCHIVED_POST_CLASSIFICATION';

@Injectable()
export class PostClassificationTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly archivesService: ArchivesService,
    private readonly taxonomyService: TaxonomyService,
    private readonly aiGatewayService: AiGatewayService,
    private readonly postClassificationService: PostClassificationService,
  ) {}

  async hasConfiguredPostClassificationModel(userId: string) {
    const model = await this.prisma.aIModelConfig.findFirst({
      where: {
        taskType: AITaskType.POST_CLASSIFY,
        enabled: true,
        provider: {
          userId,
          enabled: true,
        },
      },
      select: {
        id: true,
      },
    });

    return model !== null;
  }

  async enqueueArchivedPostClassification(
    userId: string,
    archivedPostId: string,
  ) {
    const archivedPost =
      await this.archivesService.getArchivedPostDetailForUser(
        userId,
        archivedPostId,
      );

    return this.prisma.aITaskRecord.create({
      data: {
        userId,
        taskType: AITaskType.POST_CLASSIFY,
        targetType: POST_CLASSIFICATION_TASK_TARGET_TYPE,
        targetId: archivedPost.id,
        status: AITaskStatus.PENDING,
        inputSnapshotJson: {
          archivedPostId: archivedPost.id,
          xPostId: archivedPost.xPostId,
          authorUsername: archivedPost.authorUsername,
        },
      },
    });
  }

  async executeTask(userId: string, taskRecordId: string) {
    const taskRecord = await this.prisma.aITaskRecord.findFirst({
      where: {
        id: taskRecordId,
        userId,
        taskType: AITaskType.POST_CLASSIFY,
        targetType: POST_CLASSIFICATION_TASK_TARGET_TYPE,
      },
    });

    if (!taskRecord) {
      throw new NotFoundException('AI classification task not found');
    }

    if (
      taskRecord.status === AITaskStatus.RUNNING ||
      taskRecord.status === AITaskStatus.SUCCESS ||
      taskRecord.status === AITaskStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `AI classification task cannot be executed from status ${taskRecord.status}`,
      );
    }

    const archivedPost =
      await this.archivesService.getArchivedPostDetailForUser(
        userId,
        taskRecord.targetId,
      );
    const [categories, tags] = await Promise.all([
      this.taxonomyService.listCategories(userId),
      this.taxonomyService.listTags(userId),
    ]);
    const promptInput = this.buildPromptInput(archivedPost, categories, tags);

    await this.prisma.aITaskRecord.update({
      where: {
        id: taskRecord.id,
      },
      data: {
        status: AITaskStatus.RUNNING,
        errorMessage: null,
        startedAt: new Date(),
        finishedAt: null,
        inputSnapshotJson: this.buildTaskInputSnapshot(promptInput),
      },
    });

    try {
      const gatewayResult = await this.aiGatewayService.generateText(
        userId,
        this.postClassificationService.buildAiRequest(promptInput),
      );
      const parsedResult = this.postClassificationService.parseModelOutput(
        gatewayResult.text,
        {
          availableCategorySlugs: promptInput.availableCategories.map(
            (category) => category.slug,
          ),
          availableTags: promptInput.availableTags,
        },
      );
      await this.applyClassificationResultToArchive(
        userId,
        archivedPost.id,
        promptInput,
        parsedResult,
      );

      return await this.prisma.aITaskRecord.update({
        where: {
          id: taskRecord.id,
        },
        data: this.buildSuccessUpdateData(gatewayResult, parsedResult),
      });
    } catch (error) {
      await this.prisma.aITaskRecord.update({
        where: {
          id: taskRecord.id,
        },
        data: {
          status: AITaskStatus.FAILED,
          errorMessage:
            error instanceof Error
              ? error.message
              : 'AI classification task failed',
          finishedAt: new Date(),
        },
      });

      throw error;
    }
  }

  async enqueueAndExecute(userId: string, archivedPostId: string) {
    const taskRecord = await this.enqueueArchivedPostClassification(
      userId,
      archivedPostId,
    );

    return this.executeTask(userId, taskRecord.id);
  }

  rerunArchivedPostClassification(userId: string, archivedPostId: string) {
    return this.enqueueAndExecute(userId, archivedPostId);
  }

  async rerunArchivedPostClassificationBatch(
    userId: string,
    archivedPostIds: string[],
  ) {
    const uniqueArchivedPostIds = [...new Set(archivedPostIds)];
    const results = await Promise.all(
      uniqueArchivedPostIds.map(async (archivedPostId) => {
        try {
          const taskRecord = await this.enqueueAndExecute(
            userId,
            archivedPostId,
          );

          return {
            archivedPostId,
            status: 'SUCCESS' as const,
            taskRecordId: taskRecord.id,
            errorMessage: null,
          };
        } catch (error) {
          return {
            archivedPostId,
            status: 'FAILED' as const,
            taskRecordId: null,
            errorMessage:
              error instanceof Error
                ? error.message
                : 'AI classification rerun failed',
          };
        }
      }),
    );

    return {
      requestedCount: uniqueArchivedPostIds.length,
      succeededCount: results.filter((item) => item.status === 'SUCCESS')
        .length,
      failedCount: results.filter((item) => item.status === 'FAILED').length,
      items: results,
    };
  }

  private buildPromptInput(
    archivedPost: ArchivedPostDetail,
    categories: Awaited<ReturnType<TaxonomyService['listCategories']>>,
    tags: Awaited<ReturnType<TaxonomyService['listTags']>>,
  ) {
    return {
      availableCategories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
      })),
      availableTags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color,
      })),
      post: {
        archivedPostId: archivedPost.id,
        xPostId: archivedPost.xPostId,
        postUrl: archivedPost.postUrl,
        authorUsername: archivedPost.authorUsername,
        authorDisplayName: archivedPost.authorDisplayName,
        postType: archivedPost.postType,
        language: archivedPost.language,
        rawText: archivedPost.rawText,
        sourceCreatedAt: archivedPost.sourceCreatedAt.toISOString(),
        hashtags: this.extractHashtags(archivedPost.rawPayloadJson),
        media: archivedPost.mediaItems.map((item) => ({
          mediaType: item.mediaType as MediaType,
          previewUrl: item.previewUrl,
          sourceUrl: item.sourceUrl,
          width: item.width,
          height: item.height,
          durationMs: item.durationMs,
        })),
        relations: archivedPost.relations.map((item) => ({
          relationType: item.relationType as RelationType,
          targetAuthorUsername: item.targetAuthorUsername,
          targetUrl: item.targetUrl,
          targetXPostId: item.targetXPostId,
        })),
      },
    };
  }

  private buildTaskInputSnapshot(
    input: ReturnType<PostClassificationTaskService['buildPromptInput']>,
  ): Prisma.InputJsonValue {
    return {
      archivedPostId: input.post.archivedPostId,
      xPostId: input.post.xPostId,
      postUrl: input.post.postUrl,
      authorUsername: input.post.authorUsername,
      availableCategories: input.availableCategories.map((category) => ({
        slug: category.slug,
        name: category.name,
      })),
      availableTags: input.availableTags.map((tag) => ({
        slug: tag.slug,
        name: tag.name,
      })),
    };
  }

  private buildSuccessUpdateData(
    gatewayResult: AiGatewayResult,
    parsedResult: ReturnType<PostClassificationService['parseModelOutput']>,
  ): Prisma.AITaskRecordUncheckedUpdateInput {
    return {
      status: AITaskStatus.SUCCESS,
      providerConfigId: gatewayResult.providerConfigId,
      modelConfigId: gatewayResult.modelConfigId,
      errorMessage: null,
      inputTokens: gatewayResult.usage.inputTokens,
      outputTokens: gatewayResult.usage.outputTokens,
      totalTokens: gatewayResult.usage.totalTokens,
      estimatedCostUsd:
        gatewayResult.estimatedCostUsd === null
          ? null
          : new Prisma.Decimal(gatewayResult.estimatedCostUsd),
      outputSnapshotJson: {
        modelCode: gatewayResult.modelCode,
        providerType: gatewayResult.providerType,
        finishReason: gatewayResult.finishReason,
        rawText: gatewayResult.text,
        parsedResult,
      },
      finishedAt: new Date(),
    };
  }

  private async applyClassificationResultToArchive(
    userId: string,
    archivedPostId: string,
    promptInput: ReturnType<PostClassificationTaskService['buildPromptInput']>,
    parsedResult: ReturnType<PostClassificationService['parseModelOutput']>,
  ) {
    const primaryCategoryId =
      promptInput.availableCategories.find(
        (category) => category.slug === parsedResult.primaryCategorySlug,
      )?.id ?? null;
    const archivedPost = await this.prisma.archivedPost.findUnique({
      where: {
        id: archivedPostId,
      },
      select: {
        primaryCategoryLocked: true,
        tagAssignmentsLocked: true,
      },
    });

    if (!archivedPost) {
      throw new NotFoundException('Archived post not found');
    }

    const resolvedTags = archivedPost.tagAssignmentsLocked
      ? []
      : await this.taxonomyService.ensureTagsForUser(
          userId,
          parsedResult.tagCandidates,
        );
    const tagIds = resolvedTags.map((tag) => tag.id);

    await this.prisma.$transaction(async (tx) => {
      const archivedPostUpdateData: Prisma.ArchivedPostUncheckedUpdateInput = {
        aiSummary: parsedResult.summary,
      };

      if (!archivedPost.primaryCategoryLocked) {
        archivedPostUpdateData.primaryCategoryId = primaryCategoryId;
        archivedPostUpdateData.primaryCategorySource = primaryCategoryId
          ? 'AI'
          : null;
      }

      await tx.archivedPost.update({
        where: {
          id: archivedPostId,
        },
        data: archivedPostUpdateData,
      });

      if (archivedPost.tagAssignmentsLocked) {
        return;
      }

      await tx.archivedPostTag.deleteMany({
        where: {
          archivedPostId,
        },
      });

      if (tagIds.length > 0) {
        await tx.archivedPostTag.createMany({
          data: tagIds.map((tagId) => ({
            archivedPostId,
            tagId,
            source: 'AI',
            confidence: new Prisma.Decimal(parsedResult.confidence),
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  private extractHashtags(rawPayloadJson: Prisma.JsonValue) {
    if (
      typeof rawPayloadJson !== 'object' ||
      rawPayloadJson === null ||
      Array.isArray(rawPayloadJson)
    ) {
      return [];
    }

    const entities = rawPayloadJson.entities;

    if (
      typeof entities !== 'object' ||
      entities === null ||
      Array.isArray(entities)
    ) {
      return [];
    }

    const hashtags = entities.hashtags;

    if (!Array.isArray(hashtags)) {
      return [];
    }

    return hashtags
      .map((item) => {
        if (
          typeof item !== 'object' ||
          item === null ||
          Array.isArray(item) ||
          typeof item.tag !== 'string'
        ) {
          return null;
        }

        const normalizedTag = item.tag.trim();

        return normalizedTag.length > 0 ? normalizedTag : null;
      })
      .filter((item): item is string => Boolean(item));
  }
}
