import { ReportStatus, ReportType } from '@prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import type { GenerateReportDto } from './dto/generate-report.dto';
import type { RegenerateReportDto } from './dto/regenerate-report.dto';
import { ReportAggregationService } from './report-aggregation.service';
import { ReportGenerationService } from './report-generation.service';
import { ReportsService } from './reports.service';

type GeneratedReportType = 'WEEKLY' | 'MONTHLY';
type SummaryFilters = {
  bindingIds?: unknown;
  categoryIds?: unknown;
  tagIds?: unknown;
  modes?: unknown;
};

@Injectable()
export class ReportGenerationTaskService {
  constructor(
    private readonly reportAggregationService: ReportAggregationService,
    private readonly reportsService: ReportsService,
    private readonly aiGatewayService: AiGatewayService,
    private readonly reportGenerationService: ReportGenerationService,
  ) {}

  async generateReport(
    userId: string,
    input: GenerateReportDto,
  ) {
    const reportType = this.normalizeReportType(input.reportType);
    const periodStart = this.parseRequiredDate(
      input.periodStart,
      'Report period start is invalid',
    );
    const periodEnd = this.parseRequiredDate(
      input.periodEnd,
      'Report period end is invalid',
    );

    const aggregate = await this.reportAggregationService.aggregatePeriodForUser(
      userId,
      {
        bindingIds: input.bindingIds,
        categoryIds: input.categoryIds,
        tagIds: input.tagIds,
        modes: input.modes,
        postLimit: input.postLimit,
        periodStart,
        periodEnd,
      },
    );

    if (aggregate.totalPosts === 0 || aggregate.posts.length === 0) {
      throw new BadRequestException(
        'No archived posts matched the selected report filters',
      );
    }

    const fallbackTitle = this.reportGenerationService.buildFallbackTitle(
      reportType,
      periodStart,
      periodEnd,
    );
    const pendingDocument =
      this.reportGenerationService.buildPendingReportDocument(fallbackTitle);
    const report = await this.reportsService.createReportForUser(userId, {
      reportType,
      title: fallbackTitle,
      periodStart,
      periodEnd,
      status: ReportStatus.DRAFT,
      sourcePosts: aggregate.posts.map((post) => ({
        archivedPostId: post.archivedPostId,
      })),
      richTextJson: pendingDocument.richTextJson,
      renderedHtml: pendingDocument.renderedHtml,
      summaryJson: this.reportGenerationService.buildPendingSummary({
        aggregate,
        periodStart,
        periodEnd,
        reportType,
      }),
    });

    return this.generateIntoExistingReport(userId, report.id, {
      aggregate,
      fallbackTitle,
      modelConfigId: input.modelConfigId,
      periodEnd,
      periodStart,
      reportType,
    });
  }

  async regenerateReport(
    userId: string,
    reportId: string,
    input: RegenerateReportDto = {},
  ) {
    const report = await this.reportsService.getReportDetailForUser(userId, reportId);
    const reportType = this.normalizeReportType(report.reportType);
    const filters = this.extractFiltersFromSummary(report.summaryJson);
    const aggregate = await this.reportAggregationService.aggregatePeriodForUser(
      userId,
      {
        bindingIds: filters.bindingIds,
        categoryIds: filters.categoryIds,
        tagIds: filters.tagIds,
        modes: filters.modes,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
      },
    );

    if (aggregate.totalPosts === 0 || aggregate.posts.length === 0) {
      throw new BadRequestException(
        'No archived posts matched the selected report filters',
      );
    }

    const fallbackTitle =
      report.title?.trim().length > 0
        ? report.title
        : this.reportGenerationService.buildFallbackTitle(
            reportType,
            report.periodStart,
            report.periodEnd,
          );
    const pendingDocument =
      this.reportGenerationService.buildPendingReportDocument(fallbackTitle);

    await this.reportsService.updateReportForUser(userId, report.id, {
      title: fallbackTitle,
      status: ReportStatus.DRAFT,
      sourcePosts: aggregate.posts.map((post) => ({
        archivedPostId: post.archivedPostId,
      })),
      richTextJson: pendingDocument.richTextJson,
      renderedHtml: pendingDocument.renderedHtml,
      summaryJson: this.reportGenerationService.buildPendingSummary({
        aggregate,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        reportType,
      }),
    });

    return this.generateIntoExistingReport(userId, report.id, {
      aggregate,
      fallbackTitle,
      modelConfigId: input.modelConfigId,
      periodEnd: report.periodEnd,
      periodStart: report.periodStart,
      reportType,
    });
  }

  private async generateIntoExistingReport(
    userId: string,
    reportId: string,
    input: {
      aggregate: Awaited<
        ReturnType<ReportAggregationService['aggregatePeriodForUser']>
      >;
      fallbackTitle: string;
      modelConfigId?: string;
      periodEnd: Date;
      periodStart: Date;
      reportType: GeneratedReportType;
    },
  ) {
    try {
      const gatewayResult = await this.aiGatewayService.generateText(
        userId,
        this.reportGenerationService.buildAiRequest({
          aggregate: input.aggregate,
          modelConfigId: input.modelConfigId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          reportId,
          reportType: input.reportType,
        }),
      );
      const parsedResult = this.reportGenerationService.parseModelOutput(
        gatewayResult.text,
        {
          aggregate: input.aggregate,
          fallbackTitle: input.fallbackTitle,
        },
      );
      const successDocument =
        this.reportGenerationService.buildSuccessReportDocument({
          aggregate: input.aggregate,
          parsedResult,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          reportType: input.reportType,
        });

      return this.reportsService.updateReportForUser(userId, reportId, {
        title: parsedResult.title,
        status: ReportStatus.READY,
        sourcePosts: input.aggregate.posts.map((post) => ({
          archivedPostId: post.archivedPostId,
        })),
        richTextJson: successDocument.richTextJson,
        renderedHtml: successDocument.renderedHtml,
        summaryJson: successDocument.summaryJson,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'AI report generation failed';
      const failedDocument = this.reportGenerationService.buildFailedReportDocument(
        input.fallbackTitle,
        errorMessage,
      );

      await this.reportsService.updateReportForUser(userId, reportId, {
        status: ReportStatus.FAILED,
        richTextJson: failedDocument.richTextJson,
        renderedHtml: failedDocument.renderedHtml,
        summaryJson: this.reportGenerationService.buildFailedSummary({
          aggregate: input.aggregate,
          errorMessage,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          reportType: input.reportType,
        }),
      });

      throw error;
    }
  }

  private extractFiltersFromSummary(summaryJson: unknown) {
    if (
      !summaryJson ||
      typeof summaryJson !== 'object' ||
      Array.isArray(summaryJson)
    ) {
      return {
        bindingIds: undefined,
        categoryIds: undefined,
        tagIds: undefined,
        modes: undefined,
      };
    }

    const filters: SummaryFilters | null =
      'filters' in summaryJson &&
      summaryJson.filters &&
      typeof summaryJson.filters === 'object' &&
      !Array.isArray(summaryJson.filters)
        ? (summaryJson.filters as SummaryFilters)
        : null;

    if (!filters) {
      return {
        bindingIds: undefined,
        categoryIds: undefined,
        tagIds: undefined,
        modes: undefined,
      };
    }

    const normalizeStringArray = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string')
        : undefined;

    return {
      bindingIds: normalizeStringArray(filters.bindingIds),
      categoryIds: normalizeStringArray(filters.categoryIds),
      tagIds: normalizeStringArray(filters.tagIds),
      modes: Array.isArray(filters.modes)
        ? filters.modes.filter(
            (item): item is 'RECOMMENDED' | 'HOT' | 'SEARCH' =>
              item === 'RECOMMENDED' || item === 'HOT' || item === 'SEARCH',
          )
        : undefined,
    };
  }

  private normalizeReportType(reportType: ReportType): GeneratedReportType {
    if (reportType === ReportType.WEEKLY || reportType === ReportType.MONTHLY) {
      return reportType;
    }

    throw new BadRequestException(
      'Only weekly and monthly reports are supported right now',
    );
  }

  private parseRequiredDate(value: Date | string, message: string) {
    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(message);
    }

    return parsedDate;
  }
}
