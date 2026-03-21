import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BindingRecord } from "@/app/bindings/binding-types";
import { type CategoryRecord, type TagRecord } from "@/app/taxonomy/taxonomy-types";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import { getRequestMessages } from "@/lib/request-locale";
import { ReportGenerateCard } from "./report-generate-card";
import type { ReportStatusValue, ReportsListResponse, ReportTypeValue } from "./report-types";
import {
  buildReportsQueryString,
  extractReportSummary,
  formatReportDate,
  formatReportPeriod,
  getSingleQueryValue,
  parsePositiveInt,
  type ReportsListFilters,
} from "./report-utils";

type ReportsPageProps = {
  searchParams?: Promise<{
    page?: string | string[];
    pageSize?: string | string[];
    reportType?: string | string[];
    status?: string | string[];
  }>;
};

async function getReportsData(page: number, pageSize: number, filters: ReportsListFilters) {
  const { messages } = await getRequestMessages();
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (filters.reportType) {
    searchParams.set("reportType", filters.reportType);
  }

  if (filters.status) {
    searchParams.set("status", filters.status);
  }

  try {
    const [reports, bindingsResult, categoriesResult, tagsResult] =
      await Promise.all([
        apiRequest<ReportsListResponse>({
          path: `/reports?${searchParams.toString()}`,
          method: "GET",
        }),
        apiRequest<BindingRecord[]>({
          path: "/bindings",
          method: "GET",
        }).catch(() => []),
        apiRequest<CategoryRecord[]>({
          path: "/taxonomy/categories",
          method: "GET",
        }).catch(() => []),
        apiRequest<TagRecord[]>({
          path: "/taxonomy/tags",
          method: "GET",
        }).catch(() => []),
      ]);

    return {
      error: null,
      reports,
      bindings: bindingsResult,
      categories: categoriesResult,
      tags: tagsResult,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
      reports: null,
      bindings: [] as BindingRecord[],
      categories: [] as CategoryRecord[],
      tags: [] as TagRecord[],
    };
  }
}

function getReportStatusClassName(status: ReportStatusValue) {
  const classNameMap = {
    DRAFT: "bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]",
    READY: "bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200",
  } as const;

  return classNameMap[status];
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { locale, messages } = await getRequestMessages();
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = parsePositiveInt(getSingleQueryValue(resolvedSearchParams.page), 1);
  const pageSize = parsePositiveInt(
    getSingleQueryValue(resolvedSearchParams.pageSize),
    8,
  );
  const activeFilters: ReportsListFilters = {
    reportType: getSingleQueryValue(resolvedSearchParams.reportType),
    status: getSingleQueryValue(resolvedSearchParams.status),
  };
  const resetHref = buildReportsQueryString({ pageSize: String(pageSize) });
  const { error, reports, bindings, categories, tags } = await getReportsData(
    page,
    pageSize,
    activeFilters,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.reports.eyebrow}
        title={messages.reports.title}
        description={messages.reports.description}
        badge={
          reports
            ? formatMessage(messages.reports.badge, {
                count: reports.total,
              })
            : undefined
        }
        actions={
          <Link
            href="#report-generate"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#2d4d3f] px-5 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
          >
            {messages.reports.generateAction}
          </Link>
        }
      />

      <ReportGenerateCard
        bindings={bindings}
        categories={categories}
        locale={locale}
        tags={tags}
      />

      <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
        <CardHeader className="gap-3">
          <CardTitle className="text-2xl">{messages.reports.filterTitle}</CardTitle>
          <CardDescription className="leading-6">
            {messages.reports.filterDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/reports" className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
            <input type="hidden" name="pageSize" value={String(pageSize)} />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="report-type-filter">
                {messages.reports.form.reportTypeLabel}
              </label>
              <select
                id="report-type-filter"
                name="reportType"
                defaultValue={activeFilters.reportType ?? ""}
                className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
              >
                <option value="">{messages.reports.allReportTypes}</option>
                <option value="WEEKLY">{messages.enums.reportType.WEEKLY}</option>
                <option value="MONTHLY">{messages.enums.reportType.MONTHLY}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="report-status-filter">
                {messages.reports.form.statusLabel}
              </label>
              <select
                id="report-status-filter"
                name="status"
                defaultValue={activeFilters.status ?? ""}
                className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
              >
                <option value="">{messages.reports.allStatuses}</option>
                <option value="DRAFT">{messages.enums.reportStatus.DRAFT}</option>
                <option value="READY">{messages.enums.reportStatus.READY}</option>
                <option value="FAILED">{messages.enums.reportStatus.FAILED}</option>
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#2d4d3f] px-5 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            >
              {messages.reports.applyFilters}
            </button>
            <Link
              href={resetHref ? `/reports?${resetHref}` : "/reports"}
              className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.reports.clearFilters}
            </Link>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <ErrorState
          title={messages.reports.errorTitle}
          description={error}
          action={
            <Link
              href="#report-generate"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.reports.generateAction}
            </Link>
          }
        />
      ) : null}

      {reports && reports.items.length === 0 ? (
        <EmptyState
          title={messages.reports.emptyTitle}
          description={messages.reports.emptyDescription}
          action={
            <Link
              href="#report-generate"
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#7f5a26] px-4 text-sm font-medium text-white transition-colors hover:bg-[#65471f] dark:bg-[#f2c58c] dark:text-[#2c2114] dark:hover:bg-[#e5b775]"
            >
              {messages.reports.emptyAction}
            </Link>
          }
        />
      ) : null}

      {reports && reports.items.length > 0 ? (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            {reports.items.map((report) => (
              <Card
                key={report.id}
                className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.25)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]"
              >
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`rounded-full ${getReportStatusClassName(report.status)}`}>
                      {messages.enums.reportStatus[report.status]}
                    </Badge>
                    <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                      {messages.enums.reportType[report.reportType as ReportTypeValue]}
                    </Badge>
                    <Badge className="rounded-full bg-[#fcfaf5] text-muted-foreground dark:bg-white/8 dark:text-white/70">
                      {messages.reports.createdAtLabel} {formatReportDate(report.createdAt, locale)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{report.title}</CardTitle>
                    <CardDescription className="leading-6">
                      {messages.reports.periodLabel}：
                      {formatReportPeriod(report.periodStart, report.periodEnd, locale)}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-[#f5efe4] px-4 py-4 dark:bg-[#3d3124]">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">
                        {messages.reports.sourcePostsLabel}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {report._count.sourcePosts}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#eef4f0] px-4 py-4 dark:bg-[#223228]">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f] dark:text-[#d8e2db]">
                        {messages.reports.updatedAtLabel}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {formatReportDate(report.updatedAt, locale)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4 dark:bg-white/8">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {messages.reports.reportIdLabel}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {report.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border/70 bg-[#fcfaf5] px-5 py-4 text-sm text-foreground dark:border-white/10 dark:bg-white/8">
                    <p className="font-medium">{messages.reports.summaryLabel}</p>
                    <p className="mt-2 leading-6 text-muted-foreground">
                      {extractReportSummary(
                        report.summaryJson,
                        messages.reports.noSummary,
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/reports/${report.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                    >
                      {messages.reports.viewDetail}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          {reports.total > reports.pageSize ? (
            <PaginationNav
              basePath="/reports"
              locale={locale}
              page={reports.page}
              pageSize={reports.pageSize}
              query={{
                reportType: activeFilters.reportType,
                status: activeFilters.status,
              }}
              total={reports.total}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
