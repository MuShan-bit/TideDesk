import { MediaType, PostType, RelationType, type Prisma } from '@prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
import type { AiGatewayRequest } from '../ai-gateway/ai-gateway.types';
import { normalizeTaxonomySlug } from '../taxonomy/taxonomy-slug';

export type PostClassificationCategoryOption = {
  description?: string | null;
  id: string;
  name: string;
  slug: string;
};

export type PostClassificationTagOption = {
  color?: string | null;
  id: string;
  name: string;
  slug: string;
};

export type PostClassificationMediaSnapshot = {
  durationMs?: number | null;
  height?: number | null;
  mediaType: MediaType;
  previewUrl?: string | null;
  sourceUrl?: string | null;
  width?: number | null;
};

export type PostClassificationRelationSnapshot = {
  relationType: RelationType;
  targetAuthorUsername?: string | null;
  targetUrl?: string | null;
  targetXPostId?: string | null;
};

export type PostClassificationPostSnapshot = {
  archivedPostId: string;
  authorDisplayName?: string | null;
  authorUsername: string;
  hashtags: string[];
  language?: string | null;
  media: PostClassificationMediaSnapshot[];
  postType: PostType;
  postUrl: string;
  rawText: string;
  relations: PostClassificationRelationSnapshot[];
  sourceCreatedAt: string;
  xPostId: string;
};

export type BuildPostClassificationPromptInput = {
  availableCategories: PostClassificationCategoryOption[];
  availableTags: PostClassificationTagOption[];
  post: PostClassificationPostSnapshot;
};

export type ParsedPostClassificationResult = {
  confidence: number;
  primaryCategorySlug: string | null;
  reasoning: string | null;
  summary: string;
  tagCandidates: Array<{
    name: string;
    slug: string;
  }>;
};

type ParsedOutputCandidate = Record<string, unknown>;

const MAX_POST_TEXT_LENGTH = 6000;
const MAX_TAGS = 8;
const MIN_SUMMARY_LENGTH = 8;
const MAX_SUMMARY_LENGTH = 320;
const DEFAULT_CONFIDENCE = 0.5;

@Injectable()
export class PostClassificationService {
  buildAiRequest(input: BuildPostClassificationPromptInput): AiGatewayRequest {
    const prompt = this.buildPrompt(input);

    return {
      taskType: 'POST_CLASSIFY',
      responseFormat: 'json_object',
      messages: [
        {
          role: 'system',
          content: prompt.systemPrompt,
        },
        {
          role: 'user',
          content: prompt.userPrompt,
        },
      ],
      auditMetadata: {
        targetType: 'ARCHIVED_POST',
        targetId: input.post.archivedPostId,
        inputSnapshotJson: {
          archivedPostId: input.post.archivedPostId,
          xPostId: input.post.xPostId,
          availableCategorySlugs: input.availableCategories.map(
            (category) => category.slug,
          ),
          availableTagSlugs: input.availableTags.map((tag) => tag.slug),
        },
      },
    };
  }

  buildPrompt(input: BuildPostClassificationPromptInput) {
    const postSnapshot = this.buildPromptSnapshot(input.post);
    const responseSchema = this.buildResponseSchema();
    const systemPrompt = [
      'You classify archived X posts for an editorial workspace.',
      'Choose at most one primary category and up to eight tags.',
      'You must only use category slugs listed in the prompt.',
      'Tags should reuse listed tag slugs when possible, but may propose new tag names when needed.',
      'If no category is a good fit, return null for primaryCategorySlug.',
      'Return only a JSON object that follows the response schema exactly.',
      'Keep the summary concise, factual, and suitable for downstream archive search.',
      'Confidence must be a number between 0 and 1.',
    ].join(' ');
    const userPrompt = [
      'Classify the following archived post.',
      '',
      'Available categories:',
      this.formatCategoryList(input.availableCategories),
      '',
      'Available tags:',
      this.formatTagList(input.availableTags),
      '',
      'Response schema:',
      JSON.stringify(responseSchema, null, 2),
      '',
      'Post snapshot:',
      JSON.stringify(postSnapshot, null, 2),
      '',
      'Output rules:',
      '1. primaryCategorySlug must be one of the category slugs above or null.',
      '2. tags should be ordered by relevance and contain up to eight items.',
      '3. For existing tags, return the exact catalog slug in tags[].slug.',
      '4. For new tags, provide tags[].name and you may omit tags[].slug.',
      `5. summary must be between ${MIN_SUMMARY_LENGTH} and ${MAX_SUMMARY_LENGTH} characters after trimming.`,
      '6. reasoning should briefly explain the category and tag choices.',
      '7. Return JSON only. Do not wrap the result in markdown fences.',
    ].join('\n');

    return {
      responseSchema,
      systemPrompt,
      userPrompt,
    };
  }

  parseModelOutput(
    rawOutput: string,
    options: {
      availableCategorySlugs: string[];
      availableTags: PostClassificationTagOption[];
    },
  ): ParsedPostClassificationResult {
    const parsedCandidate = this.parseJsonCandidate(rawOutput);
    const primaryCategorySlug = this.normalizePrimaryCategorySlug(
      parsedCandidate,
      new Set(options.availableCategorySlugs),
    );
    const tagCandidates = this.normalizeTagCandidates(
      parsedCandidate,
      options.availableTags,
    );
    const summary = this.normalizeSummary(parsedCandidate);
    const confidence = this.normalizeConfidence(parsedCandidate);
    const reasoning = this.normalizeReasoning(parsedCandidate);

    return {
      primaryCategorySlug,
      tagCandidates,
      summary,
      confidence,
      reasoning,
    };
  }

  private buildPromptSnapshot(post: PostClassificationPostSnapshot) {
    return {
      archivedPostId: post.archivedPostId,
      xPostId: post.xPostId,
      postUrl: post.postUrl,
      authorUsername: post.authorUsername,
      authorDisplayName: post.authorDisplayName ?? null,
      postType: post.postType,
      language: post.language ?? null,
      sourceCreatedAt: post.sourceCreatedAt,
      rawText: this.trimText(post.rawText, MAX_POST_TEXT_LENGTH),
      hashtags: [
        ...new Set(post.hashtags.map((item) => item.trim()).filter(Boolean)),
      ],
      media: post.media.map((item) => ({
        mediaType: item.mediaType,
        width: item.width ?? null,
        height: item.height ?? null,
        durationMs: item.durationMs ?? null,
        previewUrl: item.previewUrl ?? null,
      })),
      relations: post.relations.map((item) => ({
        relationType: item.relationType,
        targetXPostId: item.targetXPostId ?? null,
        targetAuthorUsername: item.targetAuthorUsername ?? null,
        targetUrl: item.targetUrl ?? null,
      })),
    };
  }

  private buildResponseSchema() {
    return {
      primaryCategorySlug: 'string | null',
      tags: [
        {
          name: 'string',
          slug: 'string | null',
        },
      ],
      summary: 'string',
      confidence: 'number (0..1)',
      reasoning: 'string | null',
    };
  }

  private formatCategoryList(categories: PostClassificationCategoryOption[]) {
    if (categories.length === 0) {
      return '- No categories are currently available.';
    }

    return categories
      .map((category) => {
        const description = category.description?.trim()
          ? ` - ${category.description.trim()}`
          : '';

        return `- ${category.slug}: ${category.name}${description}`;
      })
      .join('\n');
  }

  private formatTagList(tags: PostClassificationTagOption[]) {
    if (tags.length === 0) {
      return '- No tags are currently available.';
    }

    return tags.map((tag) => `- ${tag.slug}: ${tag.name}`).join('\n');
  }

  private parseJsonCandidate(rawOutput: string): ParsedOutputCandidate {
    const normalized = rawOutput.trim();

    if (!normalized) {
      throw new BadRequestException('AI classification output is empty');
    }

    const fenceMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidateText = fenceMatch?.[1]?.trim() ?? normalized;
    const jsonText = this.extractJsonObject(candidateText);

    try {
      const parsed = JSON.parse(jsonText) as unknown;

      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new BadRequestException(
          'AI classification output must be a JSON object',
        );
      }

      return parsed as ParsedOutputCandidate;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'AI classification output is not valid JSON',
      );
    }
  }

  private extractJsonObject(rawText: string) {
    const trimmed = rawText.trim();

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }

    const firstBraceIndex = trimmed.indexOf('{');
    const lastBraceIndex = trimmed.lastIndexOf('}');

    if (firstBraceIndex === -1 || lastBraceIndex === -1) {
      throw new BadRequestException(
        'AI classification output does not contain a JSON object',
      );
    }

    return trimmed.slice(firstBraceIndex, lastBraceIndex + 1);
  }

  private normalizePrimaryCategorySlug(
    payload: ParsedOutputCandidate,
    allowedCategorySlugs: Set<string>,
  ) {
    const directValue = this.normalizeOptionalString(
      payload.primaryCategorySlug,
    );
    const nestedValue =
      this.isRecord(payload.primaryCategory) &&
      this.normalizeOptionalString(payload.primaryCategory.slug);
    const fallbackValue = this.normalizeOptionalString(payload.primaryCategory);
    const selectedValue = directValue ?? nestedValue ?? fallbackValue ?? null;

    if (!selectedValue) {
      return null;
    }

    return allowedCategorySlugs.has(selectedValue) ? selectedValue : null;
  }

  private normalizeTagCandidates(
    payload: ParsedOutputCandidate,
    availableTags: PostClassificationTagOption[],
  ) {
    const existingTagBySlug = new Map(
      availableTags.map((tag) => [tag.slug, tag] as const),
    );
    const existingTagByNormalizedName = new Map(
      availableTags.map(
        (tag) => [this.tryNormalizeTaxonomySlug(tag.name), tag] as const,
      ),
    );
    const rawValues = Array.isArray(payload.tagSlugs)
      ? payload.tagSlugs
      : Array.isArray(payload.tags)
        ? payload.tags
        : [];
    const normalized = rawValues
      .map((item) =>
        this.normalizeTagCandidate(
          item,
          existingTagBySlug,
          existingTagByNormalizedName,
        ),
      )
      .filter(
        (
          item,
        ): item is ParsedPostClassificationResult['tagCandidates'][number] =>
          item !== null,
      );
    const deduped = [];
    const seenKeys = new Set<string>();

    for (const item of normalized) {
      if (seenKeys.has(item.slug)) {
        continue;
      }

      seenKeys.add(item.slug);
      deduped.push(item);

      if (deduped.length >= MAX_TAGS) {
        break;
      }
    }

    return deduped;
  }

  private normalizeTagCandidate(
    item: unknown,
    existingTagBySlug: Map<string, PostClassificationTagOption>,
    existingTagByNormalizedName: Map<
      string | null,
      PostClassificationTagOption
    >,
  ) {
    let rawName: string | null = null;
    let rawSlug: string | null = null;

    if (typeof item === 'string') {
      rawName = this.normalizeOptionalString(item);
      rawSlug = rawName;
    } else if (this.isRecord(item)) {
      rawName =
        this.normalizeOptionalString(item.name) ??
        this.normalizeOptionalString(item.label) ??
        this.normalizeOptionalString(item.tagName) ??
        null;
      rawSlug =
        this.normalizeOptionalString(item.slug) ??
        this.normalizeOptionalString(item.tagSlug) ??
        rawName;
    }

    const normalizedSlug = this.tryNormalizeTaxonomySlug(rawSlug);
    const normalizedName = this.tryNormalizeTaxonomySlug(rawName);
    const existingTag =
      (normalizedSlug ? existingTagBySlug.get(normalizedSlug) : null) ??
      (normalizedName
        ? existingTagByNormalizedName.get(normalizedName)
        : null) ??
      null;

    if (existingTag) {
      return {
        name: existingTag.name,
        slug: existingTag.slug,
      };
    }

    if (!normalizedSlug) {
      return null;
    }

    return {
      name: rawName ?? rawSlug ?? normalizedSlug,
      slug: normalizedSlug,
    };
  }

  private normalizeSummary(payload: ParsedOutputCandidate) {
    const value =
      this.normalizeOptionalString(payload.summary) ??
      this.normalizeOptionalString(payload.briefSummary);

    if (!value) {
      throw new BadRequestException(
        'AI classification output is missing a summary',
      );
    }

    if (
      value.length < MIN_SUMMARY_LENGTH ||
      value.length > MAX_SUMMARY_LENGTH
    ) {
      throw new BadRequestException(
        `AI classification summary must be ${MIN_SUMMARY_LENGTH}-${MAX_SUMMARY_LENGTH} characters`,
      );
    }

    return value;
  }

  private normalizeConfidence(payload: ParsedOutputCandidate) {
    const rawValue =
      payload.confidence ??
      payload.score ??
      (this.isRecord(payload.primaryCategory)
        ? payload.primaryCategory.confidence
        : undefined);

    if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
      return this.clampConfidence(rawValue);
    }

    if (typeof rawValue === 'string') {
      const normalized = rawValue.trim().replace(/%$/, '');
      const parsedNumber = Number(normalized);

      if (Number.isFinite(parsedNumber)) {
        return this.clampConfidence(parsedNumber);
      }
    }

    return DEFAULT_CONFIDENCE;
  }

  private clampConfidence(value: number) {
    const normalizedValue = value > 1 ? value / 100 : value;

    return Math.max(0, Math.min(1, Number(normalizedValue.toFixed(4))));
  }

  private normalizeReasoning(payload: ParsedOutputCandidate) {
    return (
      this.normalizeOptionalString(payload.reasoning) ??
      this.normalizeOptionalString(payload.explanation) ??
      null
    );
  }

  private normalizeOptionalString(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.replace(/\s+/g, ' ').trim();

    return normalized.length > 0 ? normalized : null;
  }

  private trimText(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
  }

  private isRecord(value: unknown): value is Prisma.JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private tryNormalizeTaxonomySlug(value: string | null) {
    if (!value) {
      return null;
    }

    try {
      return normalizeTaxonomySlug(value);
    } catch {
      return null;
    }
  }
}
