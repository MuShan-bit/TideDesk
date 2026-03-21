import { MediaType, PostType, RelationType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import {
  PostClassificationService,
  type BuildPostClassificationPromptInput,
} from './post-classification.service';

function createPromptInput(): BuildPostClassificationPromptInput {
  return {
    availableCategories: [
      {
        id: 'category-ai-signals',
        name: 'AI Signals',
        slug: 'ai-signals',
        description: 'AI models, agents, and product launches.',
      },
      {
        id: 'category-infra',
        name: 'Infra',
        slug: 'infra',
        description: 'Cloud, tooling, chips, and developer infrastructure.',
      },
    ],
    availableTags: [
      {
        id: 'tag-openai',
        name: 'OpenAI',
        slug: 'openai',
      },
      {
        id: 'tag-agents',
        name: 'Agents',
        slug: 'agents',
      },
      {
        id: 'tag-gpu',
        name: 'GPU',
        slug: 'gpu',
      },
    ],
    post: {
      archivedPostId: 'archive-001',
      xPostId: 'x-post-001',
      postUrl: 'https://x.com/demo/status/001',
      authorUsername: 'demo_author',
      authorDisplayName: 'Demo Author',
      postType: PostType.POST,
      language: 'en',
      rawText:
        'OpenAI just launched a new agent workflow and shared GPU efficiency benchmarks for production inference.',
      sourceCreatedAt: '2026-03-21T10:00:00.000Z',
      hashtags: ['OpenAI', 'Agents'],
      media: [
        {
          mediaType: MediaType.IMAGE,
          previewUrl: 'https://cdn.example.com/post.png',
          width: 1280,
          height: 720,
        },
      ],
      relations: [
        {
          relationType: RelationType.QUOTE,
          targetAuthorUsername: 'sampler',
          targetUrl: 'https://x.com/sampler/status/100',
        },
      ],
    },
  };
}

describe('PostClassificationService', () => {
  let service: PostClassificationService;

  beforeEach(() => {
    service = new PostClassificationService();
  });

  it('builds a structured AI gateway request for post classification', () => {
    const request = service.buildAiRequest(createPromptInput());

    expect(request).toEqual({
      taskType: 'POST_CLASSIFY',
      responseFormat: 'json_object',
      messages: [
        expect.objectContaining({
          role: 'system',
        }),
        expect.objectContaining({
          role: 'user',
        }),
      ],
      auditMetadata: {
        targetType: 'ARCHIVED_POST',
        targetId: 'archive-001',
        inputSnapshotJson: {
          archivedPostId: 'archive-001',
          xPostId: 'x-post-001',
          availableCategorySlugs: ['ai-signals', 'infra'],
          availableTagSlugs: ['openai', 'agents', 'gpu'],
        },
      },
    });
    expect(request.messages[0]?.content).toContain(
      'Return only a JSON object',
    );
    expect(request.messages[1]?.content).toContain('ai-signals');
    expect(request.messages[1]?.content).toContain('"primaryCategorySlug"');
    expect(request.messages[1]?.content).toContain('OpenAI just launched');
  });

  it('parses valid model output and normalizes fenced JSON responses', () => {
    const result = service.parseModelOutput(
      [
        '```json',
        '{',
        '  "primaryCategorySlug": "ai-signals",',
        '  "tagSlugs": ["openai", "agents", "agents", "unknown"],',
        '  "summary": "OpenAI shared a new agent workflow and GPU efficiency update for production teams.",',
        '  "confidence": "84%",',
        '  "reasoning": "The post is mainly about AI agents and model operations."',
        '}',
        '```',
      ].join('\n'),
      {
        availableCategorySlugs: ['ai-signals', 'infra'],
        availableTagSlugs: ['openai', 'agents', 'gpu'],
      },
    );

    expect(result).toEqual({
      primaryCategorySlug: 'ai-signals',
      tagSlugs: ['openai', 'agents'],
      summary:
        'OpenAI shared a new agent workflow and GPU efficiency update for production teams.',
      confidence: 0.84,
      reasoning: 'The post is mainly about AI agents and model operations.',
    });
  });

  it('accepts alternative nested fields and falls back for unknown categories', () => {
    const result = service.parseModelOutput(
      JSON.stringify({
        primaryCategory: {
          slug: 'not-in-catalog',
          confidence: 0.62,
        },
        tags: [{ slug: 'gpu' }, { slug: 'agents' }],
        briefSummary:
          'The post compares GPU efficiency and agent orchestration tradeoffs in deployment.',
        explanation: 'Infrastructure and agent workflow details dominate.',
      }),
      {
        availableCategorySlugs: ['ai-signals', 'infra'],
        availableTagSlugs: ['openai', 'agents', 'gpu'],
      },
    );

    expect(result).toEqual({
      primaryCategorySlug: null,
      tagSlugs: ['gpu', 'agents'],
      summary:
        'The post compares GPU efficiency and agent orchestration tradeoffs in deployment.',
      confidence: 0.62,
      reasoning: 'Infrastructure and agent workflow details dominate.',
    });
  });

  it('rejects invalid JSON or missing summaries', () => {
    expect(() =>
      service.parseModelOutput('not json', {
        availableCategorySlugs: ['ai-signals'],
        availableTagSlugs: ['openai'],
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.parseModelOutput(
        JSON.stringify({
          primaryCategorySlug: 'ai-signals',
          tagSlugs: ['openai'],
          confidence: 0.91,
        }),
        {
          availableCategorySlugs: ['ai-signals'],
          availableTagSlugs: ['openai'],
        },
      ),
    ).toThrow('missing a summary');
  });
});
