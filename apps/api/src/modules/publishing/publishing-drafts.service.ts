import { type Prisma, PublishDraftSourceType } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type RichTextDocument,
  type RichTextParagraphBlock,
} from '../archives/rich-text.converter';
import { renderRichTextToHtml } from '../archives/rich-text.renderer';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublishDraftDto } from './dto/create-publish-draft.dto';
import { ListPublishDraftsQueryDto } from './dto/list-publish-drafts-query.dto';

const DEFAULT_DRAFT_PAGE = 1;
const DEFAULT_DRAFT_PAGE_SIZE = 20;
const MAX_DRAFT_PAGE_SIZE = 100;

const publishDraftListInclude = {
  _count: {
    select: {
      publishJobs: true,
    },
  },
} satisfies Prisma.PublishDraftInclude;

const publishDraftDetailInclude = {
  publishJobs: {
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      channelBinding: {
        select: {
          id: true,
          platformType: true,
          displayName: true,
          accountIdentifier: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.PublishDraftInclude;

const publishDraftSourceReportSelect = {
  id: true,
  title: true,
  reportType: true,
  periodStart: true,
  periodEnd: true,
  summaryJson: true,
  richTextJson: true,
  renderedHtml: true,
  _count: {
    select: {
      sourcePosts: true,
    },
  },
} satisfies Prisma.ReportSelect;

const publishDraftSourceArchiveSelect = {
  id: true,
  xPostId: true,
  postUrl: true,
  rawText: true,
  aiSummary: true,
  richTextJson: true,
  renderedHtml: true,
  sourceCreatedAt: true,
  authorUsername: true,
  authorDisplayName: true,
  binding: {
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  },
} satisfies Prisma.ArchivedPostSelect;

type PublishDraftListItem = Prisma.PublishDraftGetPayload<{
  include: typeof publishDraftListInclude;
}>;

type PublishDraftDetailRecord = Prisma.PublishDraftGetPayload<{
  include: typeof publishDraftDetailInclude;
}>;

type PublishDraftSourceReport = Prisma.ReportGetPayload<{
  select: typeof publishDraftSourceReportSelect;
}>;

type PublishDraftSourceArchive = Prisma.ArchivedPostGetPayload<{
  select: typeof publishDraftSourceArchiveSelect;
}>;

type PublishDraftSourceSnapshot = {
  archivedPostIds: string[];
  reportIds: string[];
};

type PublishDraftSourceContext = {
  archivedPosts: PublishDraftSourceArchive[];
  report: PublishDraftSourceReport | null;
  sourceSnapshot: PublishDraftSourceSnapshot;
  sourceType: PublishDraftSourceType;
};

@Injectable()
export class PublishingDraftsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublishDrafts(
    userId: string,
    query: ListPublishDraftsQueryDto = {},
  ) {
    const page = this.normalizePage(query.page);
    const pageSize = this.normalizePageSize(query.pageSize);
    const where: Prisma.PublishDraftWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.publishDraft.count({ where }),
      this.prisma.publishDraft.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: publishDraftListInclude,
      }),
    ]);

    return {
      items: items.map((item) => this.mapDraftListItem(item)),
      page,
      pageSize,
      total,
    };
  }

  async getPublishDraft(userId: string, draftId: string) {
    const draft = await this.findPublishDraftOrThrow(userId, draftId);

    return this.buildPublishDraftDetail(userId, draft);
  }

  async createPublishDraft(userId: string, dto: CreatePublishDraftDto) {
    const reportId = this.normalizeOptionalString(dto.reportId);
    const archivedPostIds = this.normalizeStringArray(
      dto.archivedPostIds ?? [],
    );

    if (!reportId && archivedPostIds.length === 0) {
      throw new BadRequestException(
        'Creating a publish draft requires a report or at least one archived post',
      );
    }

    const [report, archivedPosts] = await Promise.all([
      reportId
        ? this.findSourceReportOrThrow(userId, reportId)
        : Promise.resolve(null),
      archivedPostIds.length > 0
        ? this.findSourceArchivesOrThrow(userId, archivedPostIds)
        : Promise.resolve([] as PublishDraftSourceArchive[]),
    ]);

    const sourceContext = this.buildSourceContext(report, archivedPosts);
    const title =
      this.normalizeOptionalString(dto.title) ??
      this.buildDefaultDraftTitle(sourceContext);
    const summary =
      this.normalizeOptionalString(dto.summary) ??
      this.buildDefaultDraftSummary(sourceContext);
    const richTextDocument = this.buildDraftDocument(sourceContext);
    const createdDraft = await this.prisma.publishDraft.create({
      data: {
        userId,
        sourceType: sourceContext.sourceType,
        title,
        summary,
        sourceIdsJson:
          sourceContext.sourceSnapshot satisfies Prisma.InputJsonValue,
        richTextJson: richTextDocument satisfies Prisma.InputJsonValue,
        renderedHtml: renderRichTextToHtml(richTextDocument),
      },
      include: publishDraftDetailInclude,
    });

    return this.buildPublishDraftDetail(userId, createdDraft, sourceContext);
  }

  private async buildPublishDraftDetail(
    userId: string,
    draft: PublishDraftDetailRecord,
    sourceContext?: PublishDraftSourceContext,
  ) {
    const resolvedSourceContext =
      sourceContext ??
      (await this.resolveSourceContext(userId, draft.sourceIdsJson));

    return {
      ...draft,
      sourceArchives: resolvedSourceContext.archivedPosts.map((item) =>
        this.mapSourceArchive(item),
      ),
      sourceReport: resolvedSourceContext.report
        ? this.mapSourceReport(resolvedSourceContext.report)
        : null,
      sourceSnapshot: resolvedSourceContext.sourceSnapshot,
    };
  }

  private mapDraftListItem(item: PublishDraftListItem) {
    return {
      ...item,
      sourceSnapshot: this.normalizeSourceSnapshot(item.sourceIdsJson),
    };
  }

  private mapSourceReport(report: PublishDraftSourceReport) {
    return {
      id: report.id,
      title: report.title,
      reportType: report.reportType,
      periodEnd: report.periodEnd,
      periodStart: report.periodStart,
      sourcePostsCount: report._count.sourcePosts,
      summary: this.extractReportSummary(report.summaryJson),
    };
  }

  private mapSourceArchive(archive: PublishDraftSourceArchive) {
    return {
      authorDisplayName: archive.authorDisplayName,
      authorUsername: archive.authorUsername,
      binding: archive.binding,
      id: archive.id,
      postUrl: archive.postUrl,
      rawText: archive.rawText,
      sourceCreatedAt: archive.sourceCreatedAt,
      summary: this.normalizeOptionalString(archive.aiSummary) ?? null,
      xPostId: archive.xPostId,
    };
  }

  private async resolveSourceContext(
    userId: string,
    sourceIdsJson: Prisma.JsonValue | null,
  ) {
    const sourceSnapshot = this.normalizeSourceSnapshot(sourceIdsJson);
    const [report, archivedPosts] = await Promise.all([
      sourceSnapshot.reportIds[0]
        ? this.findSourceReport(userId, sourceSnapshot.reportIds[0])
        : Promise.resolve(null),
      sourceSnapshot.archivedPostIds.length > 0
        ? this.findSourceArchives(userId, sourceSnapshot.archivedPostIds)
        : Promise.resolve([] as PublishDraftSourceArchive[]),
    ]);

    return this.buildSourceContext(report, archivedPosts, sourceSnapshot);
  }

  private buildSourceContext(
    report: PublishDraftSourceReport | null,
    archivedPosts: PublishDraftSourceArchive[],
    sourceSnapshot?: PublishDraftSourceSnapshot,
  ): PublishDraftSourceContext {
    const normalizedSnapshot = sourceSnapshot ?? {
      reportIds: report ? [report.id] : [],
      archivedPostIds: archivedPosts.map((item) => item.id),
    };

    return {
      archivedPosts,
      report,
      sourceSnapshot: normalizedSnapshot,
      sourceType: this.resolveSourceType(report, archivedPosts),
    };
  }

  private resolveSourceType(
    report: PublishDraftSourceReport | null,
    archivedPosts: PublishDraftSourceArchive[],
  ) {
    if (report && archivedPosts.length > 0) {
      return PublishDraftSourceType.MIXED;
    }

    if (report) {
      return PublishDraftSourceType.REPORT;
    }

    return PublishDraftSourceType.ARCHIVE;
  }

  private buildDefaultDraftTitle(sourceContext: PublishDraftSourceContext) {
    if (sourceContext.sourceType === PublishDraftSourceType.REPORT) {
      return sourceContext.report?.title ?? '报告发布草稿';
    }

    if (sourceContext.sourceType === PublishDraftSourceType.MIXED) {
      return sourceContext.report
        ? `${sourceContext.report.title} 发布整理稿`
        : `混合内容发布草稿 ${sourceContext.sourceSnapshot.archivedPostIds.length} 条`;
    }

    if (sourceContext.archivedPosts.length === 1) {
      return `@${sourceContext.archivedPosts[0].authorUsername} 帖子发布草稿`;
    }

    return `${sourceContext.archivedPosts.length} 条归档整理草稿`;
  }

  private buildDefaultDraftSummary(sourceContext: PublishDraftSourceContext) {
    if (sourceContext.sourceType === PublishDraftSourceType.REPORT) {
      return (
        sourceContext.report &&
        (this.extractReportSummary(sourceContext.report.summaryJson) ??
          `基于 ${sourceContext.report.title} 生成的对外发布草稿。`)
      );
    }

    if (sourceContext.sourceType === PublishDraftSourceType.MIXED) {
      return `已整合报告与 ${sourceContext.archivedPosts.length} 条归档帖子，便于继续润色后发布到外部平台。`;
    }

    if (sourceContext.archivedPosts.length === 1) {
      const archive = sourceContext.archivedPosts[0];

      return (
        this.normalizeOptionalString(archive.aiSummary) ??
        this.trimText(archive.rawText, 160)
      );
    }

    return `已汇总 ${sourceContext.archivedPosts.length} 条归档帖子，便于整理为后续可发布内容。`;
  }

  private buildDraftDocument(sourceContext: PublishDraftSourceContext) {
    if (
      sourceContext.sourceType === PublishDraftSourceType.REPORT &&
      sourceContext.report
    ) {
      const reportBlocks = this.extractRichTextBlocks(
        sourceContext.report.richTextJson,
      );

      return {
        version: 1,
        blocks:
          reportBlocks.length > 0
            ? reportBlocks
            : [this.createTextParagraph(sourceContext.report.title)],
      } satisfies RichTextDocument;
    }

    if (
      sourceContext.sourceType === PublishDraftSourceType.ARCHIVE &&
      sourceContext.archivedPosts.length === 1
    ) {
      const archive = sourceContext.archivedPosts[0];
      const archiveBlocks = this.extractRichTextBlocks(archive.richTextJson);

      return {
        version: 1,
        blocks:
          archiveBlocks.length > 0
            ? archiveBlocks
            : [
                this.createTextParagraph(`@${archive.authorUsername}`),
                ...this.createParagraphsFromPlainText(archive.rawText),
              ],
      } satisfies RichTextDocument;
    }

    const blocks: RichTextDocument['blocks'] = [];

    if (sourceContext.report) {
      blocks.push(
        this.createTextParagraph(`来源报告：${sourceContext.report.title}`),
      );
      blocks.push(
        ...this.extractRichTextBlocks(sourceContext.report.richTextJson),
      );
    }

    sourceContext.archivedPosts.forEach((archive, index) => {
      if (blocks.length > 0) {
        blocks.push(this.createTextParagraph(''));
      }

      blocks.push(
        this.createTextParagraph(
          `来源帖子 ${index + 1}：@${archive.authorUsername}`,
        ),
      );
      blocks.push(...this.extractRichTextBlocks(archive.richTextJson));
      blocks.push(
        this.createLinkParagraph('原帖链接：', '查看来源帖子', archive.postUrl),
      );
    });

    return {
      version: 1,
      blocks: blocks.length > 0 ? blocks : [this.createTextParagraph('')],
    } satisfies RichTextDocument;
  }

  private createTextParagraph(text: string): RichTextParagraphBlock {
    return {
      type: 'paragraph',
      children: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  private createLinkParagraph(
    prefix: string,
    label: string,
    href: string,
  ): RichTextParagraphBlock {
    return {
      type: 'paragraph',
      children: [
        {
          type: 'text',
          text: prefix,
        },
        {
          type: 'link',
          text: label,
          href,
        },
      ],
    };
  }

  private createParagraphsFromPlainText(text: string) {
    const normalizedText = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    const paragraphs = normalizedText
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return paragraphs.length > 0
      ? paragraphs.map((item) => this.createTextParagraph(item))
      : [this.createTextParagraph('')];
  }

  private extractRichTextBlocks(value: Prisma.JsonValue | null) {
    const document = this.parseRichTextDocument(value);

    if (document) {
      return document.blocks;
    }

    return [];
  }

  private parseRichTextDocument(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const candidate = value as {
      blocks?: unknown;
      version?: unknown;
    };

    if (candidate.version !== 1 || !Array.isArray(candidate.blocks)) {
      return null;
    }

    return this.cloneJson(value) as RichTextDocument;
  }

  private extractReportSummary(summaryJson: Prisma.JsonValue | null) {
    if (
      !summaryJson ||
      typeof summaryJson !== 'object' ||
      Array.isArray(summaryJson)
    ) {
      return null;
    }

    if (
      'summary' in summaryJson &&
      typeof summaryJson.summary === 'string' &&
      summaryJson.summary.trim().length > 0
    ) {
      return summaryJson.summary.trim();
    }

    return null;
  }

  private async findPublishDraftOrThrow(userId: string, draftId: string) {
    const draft = await this.prisma.publishDraft.findFirst({
      where: {
        id: draftId,
        userId,
      },
      include: publishDraftDetailInclude,
    });

    if (!draft) {
      throw new NotFoundException('Publish draft not found');
    }

    return draft;
  }

  private async findSourceReportOrThrow(userId: string, reportId: string) {
    const report = await this.findSourceReport(userId, reportId);

    if (!report) {
      throw new NotFoundException('Report source for publish draft not found');
    }

    return report;
  }

  private findSourceReport(userId: string, reportId: string) {
    return this.prisma.report.findFirst({
      where: {
        id: reportId,
        userId,
      },
      select: publishDraftSourceReportSelect,
    });
  }

  private async findSourceArchivesOrThrow(
    userId: string,
    archivedPostIds: string[],
  ) {
    const archives = await this.findSourceArchives(userId, archivedPostIds);

    if (archives.length !== archivedPostIds.length) {
      throw new NotFoundException(
        'One or more archived posts for the publish draft were not found',
      );
    }

    return archives;
  }

  private async findSourceArchives(userId: string, archivedPostIds: string[]) {
    const archives = await this.prisma.archivedPost.findMany({
      where: {
        id: {
          in: archivedPostIds,
        },
        binding: {
          userId,
        },
      },
      select: publishDraftSourceArchiveSelect,
    });

    const archiveMap = new Map(archives.map((item) => [item.id, item]));

    return archivedPostIds
      .map((item) => archiveMap.get(item))
      .filter((item): item is PublishDraftSourceArchive => Boolean(item));
  }

  private normalizeSourceSnapshot(
    sourceIdsJson: Prisma.JsonValue | null,
  ): PublishDraftSourceSnapshot {
    if (
      !sourceIdsJson ||
      typeof sourceIdsJson !== 'object' ||
      Array.isArray(sourceIdsJson)
    ) {
      return {
        archivedPostIds: [],
        reportIds: [],
      };
    }

    const reportIds = this.normalizeStringArray(
      'reportIds' in sourceIdsJson && Array.isArray(sourceIdsJson.reportIds)
        ? sourceIdsJson.reportIds
        : [],
    );
    const archivedPostIds = this.normalizeStringArray(
      'archivedPostIds' in sourceIdsJson &&
        Array.isArray(sourceIdsJson.archivedPostIds)
        ? sourceIdsJson.archivedPostIds
        : [],
    );

    return {
      archivedPostIds,
      reportIds,
    };
  }

  private normalizePage(value: number | undefined) {
    if (!value || Number.isNaN(value)) {
      return DEFAULT_DRAFT_PAGE;
    }

    return Math.max(DEFAULT_DRAFT_PAGE, Math.trunc(value));
  }

  private normalizePageSize(value: number | undefined) {
    if (!value || Number.isNaN(value)) {
      return DEFAULT_DRAFT_PAGE_SIZE;
    }

    return Math.min(MAX_DRAFT_PAGE_SIZE, Math.max(1, Math.trunc(value)));
  }

  private normalizeStringArray(values: unknown[]) {
    const normalizedValues: string[] = [];
    const seenValues = new Set<string>();

    for (const value of values) {
      if (typeof value !== 'string') {
        continue;
      }

      const trimmed = value.trim();

      if (trimmed.length === 0 || seenValues.has(trimmed)) {
        continue;
      }

      seenValues.add(trimmed);
      normalizedValues.push(trimmed);
    }

    return normalizedValues;
  }

  private normalizeOptionalString(value: string | null | undefined) {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }

  private trimText(value: string, maxLength: number) {
    const normalizedValue = value.replaceAll(/\s+/g, ' ').trim();

    if (normalizedValue.length <= maxLength) {
      return normalizedValue;
    }

    return `${normalizedValue.slice(0, maxLength - 1)}...`;
  }

  private cloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
