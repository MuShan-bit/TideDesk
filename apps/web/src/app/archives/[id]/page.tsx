import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  GalleryVerticalEnd,
  Languages,
  Link2,
} from "lucide-react";
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
import {
  ArchiveTaxonomyEditor,
  type ArchiveTagAssignment,
  type TaxonomyOption,
} from "./archive-taxonomy-editor";

type ArchiveDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ArchiveDetailResponse = {
  id: string;
  postType: "POST" | "REPOST" | "QUOTE" | "REPLY";
  postUrl: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  rawText: string;
  renderedHtml: string | null;
  sourceCreatedAt: string;
  archivedAt: string;
  language: string | null;
  replyCount: number | null;
  repostCount: number | null;
  quoteCount: number | null;
  favoriteCount: number | null;
  viewCount: string | null;
  primaryCategory: TaxonomyOption | null;
  primaryCategorySource: "MANUAL" | "AI" | "RULE" | null;
  primaryCategoryLocked: boolean;
  tagAssignmentsLocked: boolean;
  mediaItems: Array<{
    id: string;
    mediaType: "IMAGE" | "VIDEO" | "GIF";
    sourceUrl: string;
    previewUrl: string | null;
    width: number | null;
    height: number | null;
    durationMs: number | null;
  }>;
  tagAssignments: ArchiveTagAssignment[];
  relations: Array<{
    id: string;
    relationType: "QUOTE" | "REPOST" | "REPLY";
    targetUrl: string | null;
    targetAuthorUsername: string | null;
    targetXPostId: string | null;
  }>;
  binding: {
    id: string;
    username: string;
    displayName: string | null;
  };
  firstCrawlRun: null | {
    id: string;
    status:
      | "QUEUED"
      | "RUNNING"
      | "SUCCESS"
      | "PARTIAL_FAILED"
      | "FAILED"
      | "CANCELLED";
    triggerType: "MANUAL" | "SCHEDULED" | "RETRY";
  };
};

type TaxonomyOptionsResponse = TaxonomyOption[];

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMetric(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "0";
  }

  return String(value);
}

async function getArchiveDetail(id: string) {
  const { messages } = await getRequestMessages();

  try {
    const archive = await apiRequest<ArchiveDetailResponse>({
      path: `/archives/${id}`,
      method: "GET",
    });

    return {
      archive,
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }

    return {
      archive: null,
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
    };
  }
}

async function getTaxonomyOptions() {
  const { messages } = await getRequestMessages();

  try {
    const [categories, tags] = await Promise.all([
      apiRequest<TaxonomyOptionsResponse>({
        path: "/taxonomy/categories",
        method: "GET",
      }),
      apiRequest<TaxonomyOptionsResponse>({
        path: "/taxonomy/tags",
        method: "GET",
      }),
    ]);

    return {
      categories,
      tags,
      error: null,
    };
  } catch (error) {
    return {
      categories: [] as TaxonomyOptionsResponse,
      tags: [] as TaxonomyOptionsResponse,
      error: getApiErrorMessage(
        error,
        messages.archiveDetail.taxonomyLoadError,
      ),
    };
  }
}

export default async function ArchiveDetailPage({
  params,
}: ArchiveDetailPageProps) {
  const { locale, messages } = await getRequestMessages();
  const { id } = await params;
  const { archive, error } = await getArchiveDetail(id);
  const taxonomyOptions = archive ? await getTaxonomyOptions() : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.archiveDetail.eyebrow}
        title={
          archive
            ? `@${archive.authorUsername}`
            : messages.archiveDetail.titleFallback
        }
        description={
          archive
            ? messages.archiveDetail.descriptionReady
            : messages.archiveDetail.descriptionLoading
        }
        badge={archive ? messages.enums.postType[archive.postType] : undefined}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/archives"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              <ArrowLeft className="mr-2 size-4" />
              {messages.common.backToList}
            </Link>
            {archive ? (
              <Link
                href={archive.postUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
              >
                <ExternalLink className="mr-2 size-4" />
                {messages.archiveDetail.openOriginal}
              </Link>
            ) : null}
          </div>
        }
      />

      {error ? (
        <ErrorState
          title={messages.archiveDetail.errorTitle}
          description={error}
          action={
            <Link
              href="/archives"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.archiveDetail.errorAction}
            </Link>
          }
        />
      ) : null}

      {archive ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.28)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="rounded-full bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]">
                    {messages.enums.postType[archive.postType]}
                  </Badge>
                  <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                    {messages.archiveDetail.archivedAt}{" "}
                    {formatDateTime(archive.archivedAt, locale)}
                  </Badge>
                  {archive.language ? (
                    <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                      <Languages className="mr-1 size-3.5" />
                      {archive.language}
                    </Badge>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-3xl">
                    @{archive.authorUsername}
                    {archive.authorDisplayName ? (
                      <span className="ml-2 text-lg font-normal text-muted-foreground">
                        {archive.authorDisplayName}
                      </span>
                    ) : null}
                  </CardTitle>
                  <CardDescription className="leading-6">
                    {messages.archiveDetail.sourceBinding}：@
                    {archive.binding.username} ·{" "}
                    {messages.archiveDetail.sourceCreatedAt}：
                    {formatDateTime(archive.sourceCreatedAt, locale)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <article
                  className="rounded-[2rem] bg-[#fcfaf5] p-6 text-sm text-foreground [&_a]:font-medium [&_a]:text-[#2d4d3f] [&_a]:underline-offset-4 hover:[&_a]:underline [&_figure]:overflow-hidden [&_figure]:rounded-3xl [&_figure]:border [&_figure]:border-border/70 [&_figure]:bg-white [&_figure]:p-3 [&_img]:w-full [&_img]:rounded-2xl [&_p]:leading-8 [&_video]:w-full [&_video]:rounded-2xl dark:bg-[#161b17] dark:[&_a]:text-[#d8e2db] dark:[&_figure]:border-white/10 dark:[&_figure]:bg-white/8"
                  dangerouslySetInnerHTML={{
                    __html: archive.renderedHtml
                      ? sanitizeArchiveHtml(archive.renderedHtml)
                      : `<p>${archive.rawText.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`,
                  }}
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-[#f5efe4] px-4 py-4 dark:bg-[#3d3124]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">
                      {messages.archiveDetail.metrics.replies}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatMetric(archive.replyCount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#eef4f0] px-4 py-4 dark:bg-[#223228]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f] dark:text-[#d8e2db]">
                      {messages.archiveDetail.metrics.reposts}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatMetric(archive.repostCount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4 dark:bg-white/8">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.archiveDetail.metrics.quotes}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatMetric(archive.quoteCount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-4 py-4 dark:bg-rose-950/30">
                    <p className="text-xs uppercase tracking-[0.2em] text-rose-600 dark:text-rose-200">
                      {messages.archiveDetail.metrics.likesViews}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatMetric(archive.favoriteCount)} /{" "}
                      {formatMetric(archive.viewCount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {archive ? (
              <ArchiveTaxonomyEditor
                archiveId={archive.id}
                categories={taxonomyOptions?.categories ?? []}
                loadError={taxonomyOptions?.error}
                locale={locale}
                primaryCategory={archive.primaryCategory}
                primaryCategoryLocked={archive.primaryCategoryLocked}
                primaryCategorySource={archive.primaryCategorySource}
                tagAssignments={archive.tagAssignments}
                tagAssignmentsLocked={archive.tagAssignmentsLocked}
                tags={taxonomyOptions?.tags ?? []}
              />
            ) : null}

            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {messages.archiveDetail.sourceContextTitle}
                </CardTitle>
                <CardDescription className="leading-6">
                  {messages.archiveDetail.sourceContextDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-[#f5efe4] p-5 dark:bg-[#3d3124]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">
                    {messages.archiveDetail.originalPost}
                  </p>
                  <Link
                    href={archive.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center text-sm font-medium text-foreground underline decoration-border underline-offset-4 dark:decoration-white/20"
                  >
                    <Link2 className="mr-2 size-4" />
                    {archive.postUrl}
                  </Link>
                </div>
                <div className="rounded-3xl bg-[#eef4f0] p-5 dark:bg-[#223228]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f] dark:text-[#d8e2db]">
                    {messages.archiveDetail.binding}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    @{archive.binding.username}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {archive.binding.displayName ??
                      messages.common.noDisplayName}
                  </p>
                </div>
                {archive.firstCrawlRun ? (
                  <div className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.archiveDetail.firstRun}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {messages.enums.runStatus[archive.firstCrawlRun.status]} ·{" "}
                      {
                        messages.enums.triggerType[
                          archive.firstCrawlRun.triggerType
                        ]
                      }
                    </p>
                    <Link
                      href={`/runs/${archive.firstCrawlRun.id}`}
                      className="mt-3 inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                    >
                      {messages.archiveDetail.viewRun}
                    </Link>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card
              className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]"
              data-testid="archive-media-card"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                    <GalleryVerticalEnd className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {messages.archiveDetail.mediaTitle}
                    </CardTitle>
                    <CardDescription className="leading-6">
                      {messages.archiveDetail.mediaDescription}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {archive.mediaItems.length > 0 ? (
                  <div className="space-y-3">
                    {archive.mediaItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-4 dark:border-white/10 dark:bg-white/8"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className="rounded-full bg-[#2d4d3f] text-white">
                            {item.mediaType}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {messages.common.mediaItem} {index + 1}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {item.width !== null && item.height !== null
                            ? `${item.width} x ${item.height}`
                            : messages.common.unknownSize}
                          {item.durationMs
                            ? ` · ${Math.round(item.durationMs / 1000)} ${messages.common.seconds}`
                            : ""}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {messages.archiveDetail.mediaInlineHint}
                        </p>
                        <Link
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center text-sm font-medium text-foreground underline decoration-border underline-offset-4 dark:decoration-white/20"
                        >
                          <ExternalLink className="mr-2 size-4" />
                          {messages.common.openMedia}
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title={messages.archiveDetail.noMediaTitle}
                    description={messages.archiveDetail.noMediaDescription}
                  />
                )}

                {archive.relations.length > 0 ? (
                  <div className="space-y-3">
                    {archive.relations.map((relation) => (
                      <div
                        key={relation.id}
                        className="rounded-3xl border border-border/70 bg-white px-4 py-4 dark:border-white/10 dark:bg-white/8"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className="rounded-full bg-[#7f5a26] text-white dark:bg-[#4b3a1e] dark:text-[#f2c58c]">
                            {messages.enums.relationType[relation.relationType]}
                          </Badge>
                          <p className="text-sm text-foreground">
                            {relation.targetAuthorUsername
                              ? formatMessage(
                                  messages.archiveDetail.targetAuthor,
                                  {
                                    username: relation.targetAuthorUsername,
                                  },
                                )
                              : messages.common.noTargetAuthor}
                          </p>
                        </div>
                        {relation.targetUrl ? (
                          <Link
                            href={relation.targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center text-sm font-medium text-foreground underline decoration-border underline-offset-4 dark:decoration-white/20"
                          >
                            <ExternalLink className="mr-2 size-4" />
                            {messages.archiveDetail.openRelatedPost}
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </div>
  );
}
