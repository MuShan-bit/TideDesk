import {
  AITaskStatus,
  MediaType,
  PostType,
  Prisma,
  RelationType,
} from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import type { ArchivesService } from '../archives/archives.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { TaxonomyService } from '../taxonomy/taxonomy.service';
import type { PostClassificationService } from './post-classification.service';
import { PostClassificationTaskService } from './post-classification-task.service';

function createArchivedPostRecord() {
  return {
    id: 'archive-001',
    bindingId: 'binding-001',
    userId: 'ai_owner',
    firstCrawlRunId: null,
    xPostId: 'x-post-001',
    sourcePlatform: 'X',
    sourcePostId: null,
    postUrl: 'https://x.com/demo/status/001',
    postType: PostType.POST,
    archiveStatus: 'ACTIVE',
    primaryCategoryId: null,
    primaryCategorySource: null,
    aiSummary: null,
    authorXUserId: 'x-user-001',
    authorUsername: 'demo_author',
    authorDisplayName: 'Demo Author',
    authorAvatarUrl: null,
    language: 'en',
    rawText:
      'OpenAI shared an agent workflow update with new GPU efficiency benchmarks.',
    richTextJson: {
      version: 1,
      blocks: [],
    },
    renderedHtml: null,
    rawPayloadJson: {
      entities: {
        hashtags: [{ tag: 'OpenAI' }, { tag: 'Agents' }],
      },
    },
    sourceCreatedAt: new Date('2026-03-21T10:00:00.000Z'),
    archivedAt: new Date('2026-03-21T10:01:00.000Z'),
    replyCount: 1,
    repostCount: 2,
    quoteCount: 0,
    favoriteCount: 12,
    viewCount: BigInt(100),
    createdAt: new Date('2026-03-21T10:01:00.000Z'),
    updatedAt: new Date('2026-03-21T10:01:00.000Z'),
    binding: {
      id: 'binding-001',
      authPayloadEncrypted: 'encrypted',
    },
    firstCrawlRun: null,
    primaryCategory: null,
    mediaItems: [
      {
        id: 'media-001',
        mediaType: MediaType.IMAGE,
        sourceUrl: 'https://cdn.example.com/post.png',
        previewUrl: 'https://cdn.example.com/post-preview.png',
        width: 1280,
        height: 720,
        durationMs: null,
        sortOrder: 0,
        createdAt: new Date('2026-03-21T10:01:00.000Z'),
        archivedPostId: 'archive-001',
      },
    ],
    relations: [
      {
        id: 'relation-001',
        archivedPostId: 'archive-001',
        relationType: RelationType.QUOTE,
        targetXPostId: 'quoted-001',
        targetUrl: 'https://x.com/quoted/status/001',
        targetAuthorUsername: 'quoted_author',
        snapshotJson: null,
        createdAt: new Date('2026-03-21T10:01:00.000Z'),
      },
    ],
    runPosts: [],
    tagAssignments: [],
    archiveOccurrences: [],
    reportSourcePosts: [],
  };
}

describe('PostClassificationTaskService', () => {
  let service: PostClassificationTaskService;
  let prisma: {
    aITaskRecord: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let archivesService: {
    getArchivedPostDetailForUser: jest.Mock;
  };
  let taxonomyService: {
    listCategories: jest.Mock;
    listTags: jest.Mock;
  };
  let aiGatewayService: {
    generateText: jest.Mock;
  };
  let postClassificationService: {
    buildAiRequest: jest.Mock;
    parseModelOutput: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      aITaskRecord: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    archivesService = {
      getArchivedPostDetailForUser: jest
        .fn()
        .mockResolvedValue(createArchivedPostRecord()),
    };
    taxonomyService = {
      listCategories: jest.fn().mockResolvedValue([
        {
          id: 'category-ai',
          name: 'AI Signals',
          slug: 'ai-signals',
          description: 'AI news',
        },
      ]),
      listTags: jest.fn().mockResolvedValue([
        {
          id: 'tag-openai',
          name: 'OpenAI',
          slug: 'openai',
          color: null,
        },
        {
          id: 'tag-agents',
          name: 'Agents',
          slug: 'agents',
          color: null,
        },
      ]),
    };
    aiGatewayService = {
      generateText: jest.fn(),
    };
    postClassificationService = {
      buildAiRequest: jest.fn().mockReturnValue({
        taskType: 'POST_CLASSIFY',
        responseFormat: 'json_object',
        messages: [],
        auditMetadata: {
          targetType: 'ARCHIVED_POST',
          targetId: 'archive-001',
        },
      }),
      parseModelOutput: jest.fn(),
    };

    service = new PostClassificationTaskService(
      prisma as unknown as PrismaService,
      archivesService as unknown as ArchivesService,
      taxonomyService as unknown as TaxonomyService,
      aiGatewayService as unknown as AiGatewayService,
      postClassificationService as unknown as PostClassificationService,
    );
  });

  it('creates pending classification task records for archived posts', async () => {
    prisma.aITaskRecord.create.mockResolvedValue({
      id: 'task-001',
      status: AITaskStatus.PENDING,
    });

    await expect(
      service.enqueueArchivedPostClassification('ai_owner', 'archive-001'),
    ).resolves.toEqual({
      id: 'task-001',
      status: AITaskStatus.PENDING,
    });

    expect(prisma.aITaskRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'ai_owner',
        taskType: 'POST_CLASSIFY',
        targetType: 'ARCHIVED_POST_CLASSIFICATION',
        targetId: 'archive-001',
        status: AITaskStatus.PENDING,
      }),
    });
  });

  it('executes pending tasks and marks them successful with parsed output', async () => {
    prisma.aITaskRecord.findFirst.mockResolvedValue({
      id: 'task-001',
      userId: 'ai_owner',
      taskType: 'POST_CLASSIFY',
      targetType: 'ARCHIVED_POST_CLASSIFICATION',
      targetId: 'archive-001',
      status: AITaskStatus.PENDING,
    });
    aiGatewayService.generateText.mockResolvedValue({
      modelConfigId: 'model-001',
      providerConfigId: 'provider-001',
      providerType: 'OPENAI',
      modelCode: 'gpt-5.2',
      displayName: 'GPT-5.2',
      text: '{"primaryCategorySlug":"ai-signals"}',
      finishReason: 'stop',
      usage: {
        inputTokens: 120,
        outputTokens: 60,
        totalTokens: 180,
      },
      rawResponseJson: {
        id: 'resp-001',
      },
      estimatedCostUsd: 0.0018,
    });
    postClassificationService.parseModelOutput.mockReturnValue({
      primaryCategorySlug: 'ai-signals',
      tagSlugs: ['openai', 'agents'],
      summary: 'A concise AI summary for archive search.',
      confidence: 0.88,
      reasoning: 'The post focuses on OpenAI agents.',
    });
    prisma.aITaskRecord.update
      .mockResolvedValueOnce({
        id: 'task-001',
        status: AITaskStatus.RUNNING,
      })
      .mockResolvedValueOnce({
        id: 'task-001',
        status: AITaskStatus.SUCCESS,
      });

    await expect(service.executeTask('ai_owner', 'task-001')).resolves.toEqual({
      id: 'task-001',
      status: AITaskStatus.SUCCESS,
    });

    expect(postClassificationService.buildAiRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        post: expect.objectContaining({
          archivedPostId: 'archive-001',
          hashtags: ['OpenAI', 'Agents'],
        }),
      }),
    );
    expect(aiGatewayService.generateText).toHaveBeenCalledWith(
      'ai_owner',
      expect.objectContaining({
        taskType: 'POST_CLASSIFY',
      }),
    );
    expect(prisma.aITaskRecord.update).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'task-001',
      },
      data: expect.objectContaining({
        status: AITaskStatus.SUCCESS,
        providerConfigId: 'provider-001',
        modelConfigId: 'model-001',
        inputTokens: 120,
        outputTokens: 60,
        totalTokens: 180,
        estimatedCostUsd: new Prisma.Decimal(0.0018),
      }),
    });
  });

  it('marks task execution failures and surfaces the provider error', async () => {
    prisma.aITaskRecord.findFirst.mockResolvedValue({
      id: 'task-001',
      userId: 'ai_owner',
      taskType: 'POST_CLASSIFY',
      targetType: 'ARCHIVED_POST_CLASSIFICATION',
      targetId: 'archive-001',
      status: AITaskStatus.PENDING,
    });
    aiGatewayService.generateText.mockRejectedValue(
      new Error('Provider unavailable'),
    );
    prisma.aITaskRecord.update
      .mockResolvedValueOnce({
        id: 'task-001',
        status: AITaskStatus.RUNNING,
      })
      .mockResolvedValueOnce({
        id: 'task-001',
        status: AITaskStatus.FAILED,
      });

    await expect(service.executeTask('ai_owner', 'task-001')).rejects.toThrow(
      'Provider unavailable',
    );
    expect(prisma.aITaskRecord.update).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'task-001',
      },
      data: expect.objectContaining({
        status: AITaskStatus.FAILED,
        errorMessage: 'Provider unavailable',
      }),
    });
  });

  it('rejects missing or non-runnable task records', async () => {
    prisma.aITaskRecord.findFirst.mockResolvedValueOnce(null);

    await expect(service.executeTask('ai_owner', 'missing-task')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.aITaskRecord.findFirst.mockResolvedValueOnce({
      id: 'task-002',
      userId: 'ai_owner',
      taskType: 'POST_CLASSIFY',
      targetType: 'ARCHIVED_POST_CLASSIFICATION',
      targetId: 'archive-001',
      status: AITaskStatus.SUCCESS,
    });

    await expect(service.executeTask('ai_owner', 'task-002')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
