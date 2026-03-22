import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, SendHorizonal } from "lucide-react";
import type { PublishChannelBindingRecord } from "@/app/bindings/publish-channel-types";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sanitizeArchiveHtml } from "@/lib/archive-html";
import {
  ApiRequestError,
  apiRequest,
  getApiErrorMessage,
} from "@/lib/api-client";
import { formatMessage, getIntlLocale, type Locale } from "@/lib/i18n";
import { getRequestMessages } from "@/lib/request-locale";
import type { TagRecord } from "@/app/taxonomy/taxonomy-types";
import { PublishDraftEditor } from "../../publish-draft-editor";
import type { PublishDraftDetailRecord } from "../../publish-draft-types";
import {
  extractReportBodyText,
  formatReportPeriod,
} from "@/app/reports/report-utils";

type PublishDraftDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDraftStatusClassName(status: PublishDraftDetailRecord["status"]) {
  const classNameMap = {
    DRAFT: "bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]",
    READY: "bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]",
    PUBLISHED_PARTIAL:
      "bg-[#b95c00] text-white dark:bg-[#5a2e00] dark:text-[#ffd1a1]",
    PUBLISHED_ALL:
      "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200",
  } as const;

  return classNameMap[status];
}

async function getPublishDraftDetail(id: string) {
  const { messages } = await getRequestMessages();

  try {
    const draft = await apiRequest<PublishDraftDetailRecord>({
      path: `/publishing/drafts/${id}`,
      method: "GET",
    });

    return {
      draft,
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }

    return {
      draft: null,
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
    };
  }
}

async function getPublishDraftEditorOptions() {
  const { messages } = await getRequestMessages();

  try {
    const [availableTags, availableChannels] = await Promise.all([
      apiRequest<TagRecord[]>({
        path: "/taxonomy/tags",
        method: "GET",
      }),
      apiRequest<PublishChannelBindingRecord[]>({
        path: "/publishing/channels",
        method: "GET",
      }),
    ]);

    return {
      availableChannels,
      availableTags,
      error: null,
    };
  } catch (error) {
    return {
      availableChannels: [] as PublishChannelBindingRecord[],
      availableTags: [] as TagRecord[],
      error: getApiErrorMessage(
        error,
        messages.publishDraftDetail.editorOptionsLoadError,
      ),
    };
  }
}

export default async function PublishDraftDetailPage({
  params,
}: PublishDraftDetailPageProps) {
  const { locale, messages } = await getRequestMessages();
  const { id } = await params;
  const { draft, error } = await getPublishDraftDetail(id);
  const editorOptions = draft ? await getPublishDraftEditorOptions() : null;
  const sourceHref = draft?.sourceReport
    ? `/reports/${draft.sourceReport.id}`
    : draft?.sourceArchives[0]
      ? `/archives/${draft.sourceArchives[0].id}`
      : "/reports";
  const sourceLabel = draft?.sourceReport
    ? messages.publishDraftDetail.viewReport
    : draft?.sourceArchives[0]
      ? messages.publishDraftDetail.viewArchive
      : messages.common.backToList;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.publishDraftDetail.eyebrow}
        title={draft ? draft.title : messages.publishDraftDetail.titleFallback}
        description={
          draft
            ? messages.publishDraftDetail.descriptionReady
            : messages.publishDraftDetail.descriptionLoading
        }
        badge={
          draft
            ? `${messages.enums.publishDraftSourceType[draft.sourceType]} · ${
                messages.enums.publishDraftStatus[draft.status]
              }`
            : undefined
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/reports"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              <ArrowLeft className="mr-2 size-4" />
              {messages.common.backToList}
            </Link>
            <Link
              href={sourceHref}
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            >
              {sourceLabel}
            </Link>
          </div>
        }
      />

      {error ? (
        <ErrorState
          title={messages.publishDraftDetail.errorTitle}
          description={error}
          action={
            <Link
              href="/reports"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.publishDraftDetail.errorAction}
            </Link>
          }
        />
      ) : null}

      {draft ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.28)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    className={`rounded-full ${getDraftStatusClassName(draft.status)}`}
                  >
                    {messages.enums.publishDraftStatus[draft.status]}
                  </Badge>
                  <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                    {messages.enums.publishDraftSourceType[draft.sourceType]}
                  </Badge>
                  <Badge className="rounded-full bg-[#fcfaf5] text-muted-foreground dark:bg-white/8 dark:text-white/70">
                    {messages.publishDraftDetail.updatedAtLabel}{" "}
                    {formatDateTime(draft.updatedAt, locale)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-3xl">{draft.title}</CardTitle>
                  <CardDescription className="leading-6">
                    {draft.summary ?? messages.publishDraftDetail.noSummary}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] px-5 py-4 dark:border-white/10 dark:bg-white/8">
                  <p className="text-sm font-medium text-foreground">
                    {messages.publishDraftDetail.summaryTitle}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {draft.summary ?? messages.publishDraftDetail.noSummary}
                  </p>
                </div>

                <article
                  className="rounded-[2rem] bg-[#fcfaf5] p-6 text-sm text-foreground [&_a]:font-medium [&_a]:text-[#2d4d3f] [&_a]:underline-offset-4 hover:[&_a]:underline [&_figure]:overflow-hidden [&_figure]:rounded-3xl [&_figure]:border [&_figure]:border-border/70 [&_figure]:bg-white [&_figure]:p-3 [&_img]:w-full [&_img]:rounded-2xl [&_p]:leading-8 [&_video]:w-full [&_video]:rounded-2xl dark:bg-[#161b17] dark:[&_a]:text-[#d8e2db] dark:[&_figure]:border-white/10 dark:[&_figure]:bg-white/8"
                  dangerouslySetInnerHTML={{
                    __html: draft.renderedHtml
                      ? sanitizeArchiveHtml(draft.renderedHtml)
                      : `<p>${extractReportBodyText(draft.richTextJson)
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
                      {messages.publishDraftDetail.sourceTitle}
                    </CardTitle>
                    <CardDescription className="leading-6">
                      {messages.publishDraftDetail.sourceDescription}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {draft.sourceReport ? (
                  <div className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                        {messages.publishDraftDetail.sourceReportLabel}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {
                          messages.enums.reportType[
                            draft.sourceReport.reportType
                          ]
                        }
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-foreground">
                      {draft.sourceReport.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {formatReportPeriod(
                        draft.sourceReport.periodStart,
                        draft.sourceReport.periodEnd,
                        locale,
                      )}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {formatMessage(
                        messages.publishDraftDetail.sourcePostsCount,
                        {
                          count: draft.sourceReport.sourcePostsCount,
                        },
                      )}
                    </p>
                    <div className="mt-4">
                      <Link
                        href={`/reports/${draft.sourceReport.id}`}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                      >
                        {messages.publishDraftDetail.viewReport}
                      </Link>
                    </div>
                  </div>
                ) : null}

                {draft.sourceArchives.length > 0 ? (
                  draft.sourceArchives.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                          {messages.publishDraftDetail.sourceArchiveLabel}{" "}
                          {index + 1}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          @{item.authorUsername}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(item.sourceCreatedAt, locale)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">
                        {item.rawText}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Link
                          href={`/archives/${item.id}`}
                          className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                        >
                          {messages.publishDraftDetail.viewArchive}
                        </Link>
                        <Link
                          href={item.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center justify-center rounded-full bg-[#2d4d3f] px-3 text-xs font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                        >
                          <ExternalLink className="mr-1.5 size-3.5" />
                          {messages.publishDraftDetail.openSourcePost}
                        </Link>
                      </div>
                    </div>
                  ))
                ) : draft.sourceReport ? null : (
                  <EmptyState
                    title={messages.publishDraftDetail.emptySourceTitle}
                    description={
                      messages.publishDraftDetail.emptySourceDescription
                    }
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                    <SendHorizonal className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {messages.publishDraftDetail.contextTitle}
                    </CardTitle>
                    <CardDescription className="leading-6">
                      {messages.publishDraftDetail.contextDescription}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-[#f5efe4] p-5 dark:bg-[#3d3124]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">
                    {messages.publishDraftDetail.sourceTypeLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {messages.enums.publishDraftSourceType[draft.sourceType]}
                  </p>
                </div>
                <div className="rounded-3xl bg-[#eef4f0] p-5 dark:bg-[#223228]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f] dark:text-[#d8e2db]">
                    {messages.publishDraftDetail.sourceCountLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatMessage(
                      messages.publishDraftDetail.sourceCountValue,
                      {
                        count:
                          draft.sourceSnapshot.archivedPostIds.length +
                          draft.sourceSnapshot.reportIds.length,
                      },
                    )}
                  </p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {messages.publishDraftDetail.createdAtLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatDateTime(draft.createdAt, locale)}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {messages.publishDraftDetail.updatedAtLabel}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {formatDateTime(draft.updatedAt, locale)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {editorOptions ? (
              <PublishDraftEditor
                availableChannels={editorOptions.availableChannels}
                availableTags={editorOptions.availableTags}
                draft={draft}
                editorOptionsError={editorOptions.error}
                locale={locale}
              />
            ) : null}

            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {messages.publishDraftDetail.jobsTitle}
                </CardTitle>
                <CardDescription className="leading-6">
                  {messages.publishDraftDetail.jobsDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {draft.publishJobs.length > 0 ? (
                  draft.publishJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                          {
                            messages.enums.publishPlatformType[
                              job.channelBinding.platformType
                            ]
                          }
                        </Badge>
                        <Badge className="rounded-full bg-[#fcfaf5] text-muted-foreground dark:bg-white/10 dark:text-white/70">
                          {messages.enums.publishJobStatus[job.status]}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {job.channelBinding.displayName}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {job.channelBinding.accountIdentifier ??
                          messages.publishDraftDetail.noAccountIdentifier}
                      </p>
                      {job.errorMessage ? (
                        <p className="mt-3 text-sm leading-6 text-red-600 dark:text-red-200">
                          {job.errorMessage}
                        </p>
                      ) : null}
                      {job.remotePostUrl ? (
                        <div className="mt-4">
                          <Link
                            href={job.remotePostUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                          >
                            <ExternalLink className="mr-1.5 size-3.5" />
                            {messages.publishDraftDetail.openPublishedPost}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title={messages.publishDraftDetail.emptyJobsTitle}
                    description={
                      messages.publishDraftDetail.emptyJobsDescription
                    }
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </div>
  );
}
