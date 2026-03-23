import { AITaskType } from '@prisma/client';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { PublishingDraftRewriteService } from './publishing-draft-rewrite.service';
import { PublishingDraftsService } from './publishing-drafts.service';

describe('PublishingDraftRewriteService', () => {
  let service: PublishingDraftRewriteService;
  let publishingDraftsService: jest.Mocked<PublishingDraftsService>;
  let aiGatewayService: jest.Mocked<AiGatewayService>;

  beforeEach(() => {
    publishingDraftsService = {
      getPublishDraft: jest.fn(),
      updatePublishDraft: jest.fn(),
    } as unknown as jest.Mocked<PublishingDraftsService>;
    aiGatewayService = {
      generateText: jest.fn(),
    } as unknown as jest.Mocked<AiGatewayService>;
    service = new PublishingDraftRewriteService(
      publishingDraftsService,
      aiGatewayService,
    );
  });

  it('builds a DRAFT_REWRITE AI request with dynamic rewrite options', () => {
    const request = service.buildAiRequest(createDraft(), {
      stylePreset: 'PRACTICAL_GUIDE',
      tonePreset: 'FRIENDLY',
      structurePreset: 'NUMBERED_LIST',
      lengthPreset: 'MEDIUM',
      platformStyle: 'ZHIHU',
      audience: '关注 AI 应用落地的普通读者',
      coreMessage: '突出这组内容对真实工作的参考价值',
      readerTakeaway: '看完能知道值得关注的方向',
      includeSourceLinks: true,
      preserveMediaReferences: true,
    });

    expect(request.taskType).toBe(AITaskType.DRAFT_REWRITE);
    expect(request.responseFormat).toBe('json_object');
    expect(request.auditMetadata?.targetType).toBe('PUBLISH_DRAFT');
    expect(request.messages[1]?.content).toContain('知乎专栏文章');
    expect(request.messages[1]?.content).toContain('实用指南');
    expect(request.messages[1]?.content).toContain('目标读者');
  });

  it('rewrites a draft through AI and persists the generated result', async () => {
    publishingDraftsService.getPublishDraft.mockResolvedValue(createDraft());
    aiGatewayService.generateText.mockResolvedValue({
      providerType: 'OPENAI',
      providerConfigId: 'provider-001',
      modelConfigId: 'model-001',
      modelCode: 'gpt-5.4',
      displayName: 'GPT 5.4',
      text: JSON.stringify({
        title: '值得关注的 AI 工作流新信号',
        summary: '从几条一线帖子里，提炼出真正值得普通读者理解的变化。',
        body: '# 为什么值得看\n\n- 第一条\n- 第二条\n\n![image](https://images.example.com/demo.png)',
      }),
      finishReason: 'stop',
      usage: {
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
      },
      rawResponseJson: {},
      estimatedCostUsd: 0.12,
    });
    publishingDraftsService.updatePublishDraft.mockResolvedValue({
      ...createDraft(),
      title: '值得关注的 AI 工作流新信号',
      summary: '从几条一线帖子里，提炼出真正值得普通读者理解的变化。',
    });

    const result = await service.rewriteDraft('user-001', 'draft-001', {
      stylePreset: 'CURATED_INSIGHT',
      tonePreset: 'PROFESSIONAL',
      structurePreset: 'OPENING_BODY_TAKEAWAYS',
      lengthPreset: 'MEDIUM',
    });

    expect(aiGatewayService.generateText).toHaveBeenCalledWith(
      'user-001',
      expect.objectContaining({
        taskType: AITaskType.DRAFT_REWRITE,
      }),
    );
    expect(publishingDraftsService.updatePublishDraft).toHaveBeenCalledWith(
      'user-001',
      'draft-001',
      expect.objectContaining({
        title: '值得关注的 AI 工作流新信号',
        summary: '从几条一线帖子里，提炼出真正值得普通读者理解的变化。',
        bodyText: expect.stringContaining('# 为什么值得看'),
      }),
    );
    expect(result.rewrite.modelConfigId).toBe('model-001');
  });
});

function createDraft() {
  return {
    id: 'draft-001',
    sourceType: 'REPORT',
    status: 'READY',
    title: 'AI 周报发布稿',
    summary: '这是一份内部草稿摘要。',
    richTextJson: {
      version: 1,
      blocks: [
        {
          type: 'heading',
          level: 2,
          children: [{ type: 'text', text: '原始小标题' }],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', text: '原始正文段落。' }],
        },
        {
          type: 'media',
          mediaType: 'IMAGE',
          sourceUrl: 'https://images.example.com/original.png',
        },
      ],
    },
    renderedHtml: '<h2>原始小标题</h2><p>原始正文段落。</p>',
    createdAt: new Date('2026-03-23T00:00:00.000Z'),
    updatedAt: new Date('2026-03-23T00:30:00.000Z'),
    sourceSnapshot: {
      reportIds: ['report-001'],
      archivedPostIds: ['archive-001'],
    },
    sourceReport: {
      id: 'report-001',
      title: 'AI 周报',
      reportType: 'WEEKLY',
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-03-08T00:00:00.000Z'),
      sourcePostsCount: 1,
      summary: '报告摘要',
    },
    sourceArchives: [
      {
        id: 'archive-001',
        xPostId: 'post-001',
        postUrl: 'https://x.com/demo/status/001',
        rawText: '一条有价值的来源帖子。',
        sourceCreatedAt: new Date('2026-03-06T10:00:00.000Z'),
        authorUsername: 'demo_author',
        authorDisplayName: 'Demo Author',
        summary: '来源帖子摘要',
        binding: {
          id: 'binding-001',
          username: 'demo_binding',
          displayName: 'Demo Binding',
        },
      },
    ],
    publishJobs: [],
    tagAssignments: [
      {
        id: 'assignment-001',
        createdAt: new Date('2026-03-23T00:05:00.000Z'),
        tag: {
          id: 'tag-001',
          name: 'AI',
          slug: 'ai',
          color: '#10b981',
          isActive: true,
          isSystem: false,
          createdAt: new Date('2026-03-23T00:00:00.000Z'),
          updatedAt: new Date('2026-03-23T00:00:00.000Z'),
        },
      },
    ],
    targetChannels: [
      {
        id: 'target-001',
        createdAt: new Date('2026-03-23T00:05:00.000Z'),
        channelBinding: {
          id: 'channel-001',
          platformType: 'ZHIHU',
          displayName: '知乎专栏',
          accountIdentifier: 'demo',
          status: 'ACTIVE',
          lastValidatedAt: new Date('2026-03-23T00:00:00.000Z'),
          lastValidationError: null,
          createdAt: new Date('2026-03-22T00:00:00.000Z'),
          updatedAt: new Date('2026-03-23T00:00:00.000Z'),
        },
      },
    ],
  } as Awaited<ReturnType<PublishingDraftsService['getPublishDraft']>>;
}
