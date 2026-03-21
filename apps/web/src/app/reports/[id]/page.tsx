import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, SendHorizonal } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiRequestError, apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { sanitizeArchiveHtml } from "@/lib/archive-html";
import { formatMessage } from "@/lib/i18n";
import { getRequestMessages } from "@/lib/request-locale";
import { ReportEditor } from "../report-editor";
import type { ReportDetailRecord } from "../report-types";
import {
  buildReportTitleBadge,
  extractReportBodyText,
  extractReportSummary,
  formatReportDate,
  formatReportPeriod,
} from "../report-utils";

type ReportDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getReportStatusClassName(status: ReportDetailRecord["status"]) {
  const classNameMap = {
    DRAFT: "bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]",
    READY: "bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200",
  } as const;

  return classNameMap[status];
}

async function getReportDetail(id: string) {
  const { messages } = await getRequestMessages();

  try {
    const report = await apiRequest<ReportDetailRecord>({
      path: `/reports/${id}`,
      method: "GET",
    });

    return {
      error: null,
      report,
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }

    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
      report: null,
    };
  }
}

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { locale, messages } = await getRequestMessages();
  const { id } = await params;
  const { error, report } = await getReportDetail(id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.reportDetail.eyebrow}
        title={report ? report.title : messages.reportDetail.titleFallback}
        description={
          report
            ? messages.reportDetail.descriptionReady
            : messages.reportDetail.descriptionLoading
        }
        badge={
          report ? buildReportTitleBadge(report, messages) : undefined
        }
        actions={
          <Link
            href="/reports"
            className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
          >
            <ArrowLeft className="mr-2 size-4" />
            {messages.common.backToList}
          </Link>
        }
      />

      {error ? (
        <ErrorState
          title={messages.reportDetail.errorTitle}
          description={error}
          action={
            <Link
              href="/reports"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.reportDetail.errorAction}
            </Link>
          }
        />
      ) : null}

      {report ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.28)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`rounded-full ${getReportStatusClassName(report.status)}`}>
                    {messages.enums.reportStatus[report.status]}
                  </Badge>
                  <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                    {messages.enums.reportType[report.reportType]}
                  </Badge>
                  <Badge className="rounded-full bg-[#fcfaf5] text-muted-foreground dark:bg-white/8 dark:text-white/70">
                    {messages.reportDetail.updatedAtLabel} {formatReportDate(report.updatedAt, locale)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-3xl">{report.title}</CardTitle>
                  <CardDescription className="leading-6">
                    {messages.reportDetail.periodLabel}：
                    {formatReportPeriod(report.periodStart, report.periodEnd, locale)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] px-5 py-4 dark:border-white/10 dark:bg-white/8">
                  <p className="text-sm font-medium text-foreground">
                    {messages.reportDetail.summaryTitle}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {extractReportSummary(
                      report.summaryJson,
                      messages.reportDetail.noSummary,
                    )}
                  </p>
                </div>

                <article
                  className="rounded-[2rem] bg-[#fcfaf5] p-6 text-sm text-foreground [&_a]:font-medium [&_a]:text-[#2d4d3f] [&_a]:underline-offset-4 hover:[&_a]:underline [&_figure]:overflow-hidden [&_figure]:rounded-3xl [&_figure]:border [&_figure]:border-border/70 [&_figure]:bg-white [&_figure]:p-3 [&_img]:w-full [&_img]:rounded-2xl [&_p]:leading-8 [&_video]:w-full [&_video]:rounded-2xl dark:bg-[#161b17] dark:[&_a]:text-[#d8e2db] dark:[&_figure]:border-white/10 dark:[&_figure]:bg-white/8"
                  dangerouslySetInnerHTML={{
                    __html: report.renderedHtml
                      ? sanitizeArchiveHtml(report.renderedHtml)
                      : `<p>${extractReportBodyText(report.richTextJson)
                          .replaceAll("&", "&amp;")
                          .replaceAll("<", "&lt;")
                          .replaceAll(">", "&gt;")
                          .replaceAll("\n\n", "</p><p>")}</p>`,
                  }}
                />
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {messages.reportDetail.sourcePostsTitle}
                    </CardTitle>
                    <CardDescription className="leading-6">
                      {messages.reportDetail.sourcePostsDescription}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {report.sourcePosts.length > 0 ? (
                  report.sourcePosts.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                          {messages.reportDetail.sourcePostLabel} {index + 1}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          @{item.archivedPost.authorUsername}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatReportDate(item.archivedPost.sourceCreatedAt, locale)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">
                        {item.archivedPost.rawText}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={`/archives/${item.archivedPost.id}`}
                          className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                        >
                          {messages.reportDetail.viewArchive}
                        </Link>
                        <Link
                          href={item.archivedPost.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center justify-center rounded-full bg-[#2d4d3f] px-3 text-xs font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                        >
                          <ExternalLink className="mr-1.5 size-3.5" />
                          {messages.reportDetail.openSourcePost}
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title={messages.reportDetail.emptySourcePostsTitle}
                    description={messages.reportDetail.emptySourcePostsDescription}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {messages.reportDetail.contextTitle}
                </CardTitle>
                <CardDescription className="leading-6">
                  {messages.reportDetail.contextDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-[#f5efe4] p-5 dark:bg-[#3d3124]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">
                    {messages.reportDetail.periodLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatReportPeriod(report.periodStart, report.periodEnd, locale)}
                  </p>
                </div>
                <div className="rounded-3xl bg-[#eef4f0] p-5 dark:bg-[#223228]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f] dark:text-[#d8e2db]">
                    {messages.reportDetail.sourcePostsCountLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatMessage(messages.reportDetail.sourcePostsCount, {
                      count: report.sourcePosts.length,
                    })}
                  </p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {messages.reportDetail.createdAtLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatReportDate(report.createdAt, locale)}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {messages.reportDetail.updatedAtLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatReportDate(report.updatedAt, locale)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <ReportEditor
              bodyText={extractReportBodyText(report.richTextJson)}
              locale={locale}
              report={report}
            />

            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                    <SendHorizonal className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {messages.reportDetail.publishTitle}
                    </CardTitle>
                    <CardDescription className="leading-6">
                      {messages.reportDetail.publishDescription}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl border border-dashed border-border/70 bg-[#fcfaf5] p-5 text-sm leading-6 text-muted-foreground dark:border-white/10 dark:bg-white/8">
                  {messages.reportDetail.publishPendingHint}
                </div>
                <button
                  disabled
                  className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-full bg-muted px-4 text-sm font-medium text-muted-foreground"
                >
                  {messages.reportDetail.publishAction}
                </button>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </div>
  );
}
