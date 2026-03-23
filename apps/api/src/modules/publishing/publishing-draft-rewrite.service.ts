import { AITaskType, type Prisma } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import { PublishingDraftsService } from './publishing-drafts.service';
import { RewritePublishDraftDto } from './dto/rewrite-publish-draft.dto';

type PublishDraftDetail = Awaited<
  ReturnType<PublishingDraftsService['getPublishDraft']>
>;

@Injectable()
export class PublishingDraftRewriteService {
  constructor(
    private readonly publishingDraftsService: PublishingDraftsService,
    private readonly aiGatewayService: AiGatewayService,
  ) {}

  async rewriteDraft(
    userId: string,
    draftId: string,
    dto: RewritePublishDraftDto,
  ) {
    const draft = await this.publishingDraftsService.getPublishDraft(
      userId,
      draftId,
    );
    const request = this.buildAiRequest(draft, dto);
    const aiResult = await this.aiGatewayService.generateText(userId, request);
    const parsedResult = this.parseModelOutput(aiResult.text, draft);
    const updatedDraft = await this.publishingDraftsService.updatePublishDraft(
      userId,
      draftId,
      {
        title: parsedResult.title,
        summary: parsedResult.summary,
        bodyText: parsedResult.body,
      },
    );

    return {
      draft: updatedDraft,
      rewrite: {
        modelConfigId: aiResult.modelConfigId,
        providerConfigId: aiResult.providerConfigId,
        providerType: aiResult.providerType,
        modelCode: aiResult.modelCode,
        displayName: aiResult.displayName,
        usage: aiResult.usage,
        estimatedCostUsd: aiResult.estimatedCostUsd,
      },
    };
  }

  buildAiRequest(draft: PublishDraftDetail, dto: RewritePublishDraftDto) {
    const prompt = this.buildPrompt(draft, dto);

    return {
      taskType: AITaskType.DRAFT_REWRITE,
      modelConfigId: this.normalizeOptionalString(dto.modelConfigId) ?? undefined,
      responseFormat: 'json_object' as const,
      messages: [
        {
          role: 'system' as const,
          content: prompt.systemPrompt,
        },
        {
          role: 'user' as const,
          content: prompt.userPrompt,
        },
      ],
      auditMetadata: {
        targetType: 'PUBLISH_DRAFT',
        targetId: draft.id,
        inputSnapshotJson: {
          draftId: draft.id,
          sourceType: draft.sourceType,
          targetChannels: draft.targetChannels.map((item) => ({
            id: item.channelBinding.id,
            platformType: item.channelBinding.platformType,
            displayName: item.channelBinding.displayName,
          })),
          rewriteOptions: dto,
        },
      },
    };
  }

  parseModelOutput(text: string, draft: Pick<PublishDraftDetail, 'title' | 'summary'>) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(this.stripCodeFence(text));
    } catch {
      throw new BadRequestException('Draft rewrite model output must be valid JSON');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException(
        'Draft rewrite model output must be a JSON object',
      );
    }

    const candidate = parsed as {
      body?: unknown;
      summary?: unknown;
      title?: unknown;
    };
    const title =
      typeof candidate.title === 'string' && candidate.title.trim().length > 0
        ? candidate.title.trim()
        : draft.title;
    const summary =
      typeof candidate.summary === 'string' && candidate.summary.trim().length > 0
        ? candidate.summary.trim()
        : draft.summary ?? '';
    const body =
      typeof candidate.body === 'string' && candidate.body.trim().length > 0
        ? candidate.body.trim()
        : null;

    if (!body) {
      throw new BadRequestException('Draft rewrite model output must include body');
    }

    return {
      title,
      summary,
      body,
    };
  }

  private buildPrompt(draft: PublishDraftDetail, dto: RewritePublishDraftDto) {
    const responseSchema = {
      title: 'string',
      summary: 'string',
      body: 'string',
    };
    const systemPrompt = [
      'You rewrite publishing drafts into public-facing articles.',
      'Write in Simplified Chinese and keep proper nouns in their original casing.',
      'Preserve factual accuracy and do not invent statistics, quotes, sources, or media.',
      'When media references should be preserved, keep image placeholders as ![image](URL) and video placeholders as 视频链接：URL.',
      'Return JSON only and follow the response schema exactly.',
    ].join(' ');
    const userPrompt = [
      '请将下面的发布草稿改写为适合公开分享的文章。',
      '',
      '改写目标：',
      `- 平台风格：${this.getPlatformStyleLabel(dto.platformStyle)}`,
      `- 文章风格：${this.getStylePresetLabel(dto.stylePreset)}`,
      `- 语气：${this.getTonePresetLabel(dto.tonePreset)}`,
      `- 结构：${this.getStructurePresetLabel(dto.structurePreset)}`,
      `- 篇幅：${this.getLengthPresetLabel(dto.lengthPreset)}`,
      `- 开头方式：${this.getLeadStyleLabel(dto.leadStyle)}`,
      `- 结尾方式：${this.getEndingStyleLabel(dto.endingStyle)}`,
      `- 目标读者：${this.normalizeOptionalString(dto.audience) ?? '普通互联网读者'}`,
      `- 核心表达：${this.normalizeOptionalString(dto.coreMessage) ?? '提炼内容价值，面向大众清晰分享'}`,
      `- 读者收获：${this.normalizeOptionalString(dto.readerTakeaway) ?? '让读者快速看懂重点并愿意继续阅读'}`,
      `- 避免表达：${this.normalizeOptionalString(dto.avoidPhrases) ?? '避免内部汇报口吻、避免堆砌统计项、避免官话套话'}`,
      `- 是否保留来源链接：${dto.includeSourceLinks !== false ? '是' : '否'}`,
      `- 是否保留媒体引用：${dto.preserveMediaReferences !== false ? '是' : '否'}`,
      '',
      '输出要求：',
      '1. title 要像真实公开文章标题，不要写成“周报”“统计汇总”“运行记录”。',
      '2. summary 要像导语摘要，突出阅读价值。',
      '3. body 使用适合发布的正文结构，可包含小标题、列表、引用和媒体占位。',
      '4. 不要写内部流程、系统进度、抓取统计、任务状态等面向操作者的信息。',
      '5. 如果原文里有图片或视频线索，并且要求保留媒体引用，请自然安插到正文中。',
      '6. 允许重组结构、润色表达，但不要虚构事实。',
      '7. 输出结构：',
      JSON.stringify(responseSchema, null, 2),
      '',
      '当前草稿：',
      JSON.stringify(this.buildDraftSnapshot(draft), null, 2),
      '',
      this.normalizeOptionalString(dto.customInstructions)
        ? `额外要求：${dto.customInstructions?.trim()}`
        : '',
    ]
      .filter((item) => item.length > 0)
      .join('\n');

    return {
      systemPrompt,
      userPrompt,
    };
  }

  private buildDraftSnapshot(draft: PublishDraftDetail) {
    return {
      draftId: draft.id,
      title: draft.title,
      summary: draft.summary,
      bodyText: this.extractDraftBodyText(draft.richTextJson),
      tags: draft.tagAssignments.map((item) => item.tag.name),
      targetChannels: draft.targetChannels.map((item) => ({
        platformType: item.channelBinding.platformType,
        displayName: item.channelBinding.displayName,
      })),
      sourceReport: draft.sourceReport
        ? {
            id: draft.sourceReport.id,
            title: draft.sourceReport.title,
            summary: draft.sourceReport.summary,
          }
        : null,
      sourceArchives: draft.sourceArchives.slice(0, 8).map((item) => ({
        id: item.id,
        authorUsername: item.authorUsername,
        summary: item.summary,
        rawText: item.rawText,
        postUrl: item.postUrl,
      })),
    } satisfies Prisma.JsonObject;
  }

  private extractDraftBodyText(richTextJson: unknown) {
    if (
      !richTextJson ||
      typeof richTextJson !== 'object' ||
      Array.isArray(richTextJson)
    ) {
      return '';
    }

    const blocks =
      'blocks' in richTextJson && Array.isArray(richTextJson.blocks)
        ? richTextJson.blocks
        : [];

    return blocks
      .map((block) => {
        if (!block || typeof block !== 'object' || !('type' in block)) {
          return null;
        }

        if (
          (block.type === 'paragraph' ||
            block.type === 'heading' ||
            block.type === 'quote') &&
          'children' in block &&
          Array.isArray(block.children)
        ) {
          return block.children
            .map((node: unknown) =>
              node &&
              typeof node === 'object' &&
              'text' in node &&
              typeof node.text === 'string'
                ? node.text
                : '',
            )
            .join('');
        }

        if (
          block.type === 'list' &&
          'items' in block &&
          Array.isArray(block.items)
        ) {
          return block.items
            .map((item: unknown) =>
              Array.isArray(item)
                ? item
                    .map((node: unknown) =>
                      node &&
                      typeof node === 'object' &&
                      'text' in node &&
                      typeof node.text === 'string'
                        ? node.text
                        : '',
                    )
                    .join('')
                : '',
            )
            .join('\n');
        }

        if (
          block.type === 'media' &&
          'sourceUrl' in block &&
          typeof block.sourceUrl === 'string'
        ) {
          return 'mediaType' in block && block.mediaType === 'VIDEO'
            ? `视频链接：${block.sourceUrl}`
            : `![image](${block.sourceUrl})`;
        }

        return null;
      })
      .filter((item): item is string => item !== null && item.length > 0)
      .join('\n\n');
  }

  private stripCodeFence(value: string) {
    const trimmed = value.trim();

    if (!trimmed.startsWith('```')) {
      return trimmed;
    }

    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  private normalizeOptionalString(value: string | undefined) {
    if (value === undefined) {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  private getPlatformStyleLabel(value: RewritePublishDraftDto['platformStyle']) {
    switch (value) {
      case 'WECHAT':
        return '微信公众号长文';
      case 'ZHIHU':
        return '知乎专栏文章';
      case 'CSDN':
        return 'CSDN 技术博客';
      default:
        return '通用公开文章';
    }
  }

  private getStylePresetLabel(value: RewritePublishDraftDto['stylePreset']) {
    switch (value) {
      case 'PRACTICAL_GUIDE':
        return '实用指南';
      case 'TREND_COMMENTARY':
        return '趋势解读';
      case 'STORYTELLING':
        return '叙事讲述';
      case 'WEEKLY_SELECTION':
        return '精选分享';
      default:
        return '洞察型分享';
    }
  }

  private getTonePresetLabel(value: RewritePublishDraftDto['tonePreset']) {
    switch (value) {
      case 'FRIENDLY':
        return '友好自然';
      case 'SHARP':
        return '观点鲜明';
      case 'CALM':
        return '冷静克制';
      case 'ENERGETIC':
        return '有感染力';
      default:
        return '专业清晰';
    }
  }

  private getStructurePresetLabel(
    value: RewritePublishDraftDto['structurePreset'],
  ) {
    switch (value) {
      case 'NUMBERED_LIST':
        return '编号清单';
      case 'QUESTION_ANSWER':
        return '问答展开';
      case 'BULLET_DIGEST':
        return '要点速览';
      default:
        return '导语 + 正文 + 收尾';
    }
  }

  private getLengthPresetLabel(value: RewritePublishDraftDto['lengthPreset']) {
    switch (value) {
      case 'SHORT':
        return '短';
      case 'LONG':
        return '长';
      default:
        return '中等';
    }
  }

  private getLeadStyleLabel(value: RewritePublishDraftDto['leadStyle']) {
    switch (value) {
      case 'QUESTION':
        return '问题开场';
      case 'SCENARIO':
        return '场景开场';
      case 'HOT_TAKE':
        return '观点开场';
      default:
        return '直接切入';
    }
  }

  private getEndingStyleLabel(value: RewritePublishDraftDto['endingStyle']) {
    switch (value) {
      case 'CALL_TO_ACTION':
        return '行动号召';
      case 'QUESTION':
        return '抛出问题';
      case 'NEXT_STEP':
        return '给出下一步建议';
      default:
        return '总结收束';
    }
  }
}
