import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatMessage, getIntlLocale, type Locale } from "@/lib/i18n";
import { getRequestMessages } from "@/lib/request-locale";
import type {
  PublishDraftStatusValue,
  PublishDraftsListResponse,
} from "./publish-draft-types";

type PublishingPageProps = {
  searchParams?: Promise<{
    page?: string | string[];
    pageSize?: string | string[];
    sourceType?: string | string[];
    status?: string | string[];
  }>;
};

function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildPublishingQueryString(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim().length > 0) {
      searchParams.set(key, value);
    }
  });

  return searchParams.toString();
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDraftStatusClassName(status: PublishDraftStatusValue) {
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

async function getPublishingDrafts(
  page: number,
  pageSize: number,
  filters: {
    sourceType?: string;
    status?: string;
  },
) {
  const { messages } = await getRequestMessages();
  const queryString = buildPublishingQueryString({
    page: String(page),
    pageSize: String(pageSize),
    sourceType: filters.sourceType,
    status: filters.status,
  });

  try {
    const drafts = await apiRequest<PublishDraftsListResponse>({
      path: `/publishing/drafts?${queryString}`,
      method: "GET",
    });

    return {
      drafts,
      error: null,
    };
  } catch (error) {
    return {
      drafts: null,
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
    };
  }
}

export default async function PublishingPage({
  searchParams,
}: PublishingPageProps) {
  const { locale, messages } = await getRequestMessages();
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = parsePositiveInt(getSingleQueryValue(resolvedSearchParams.page), 1);
  const pageSize = parsePositiveInt(
    getSingleQueryValue(resolvedSearchParams.pageSize),
    8,
  );
  const activeFilters = {
    sourceType: getSingleQueryValue(resolvedSearchParams.sourceType),
    status: getSingleQueryValue(resolvedSearchParams.status),
  };
  const resetHref = buildPublishingQueryString({
    pageSize: String(pageSize),
  });
  const { drafts, error } = await getPublishingDrafts(
    page,
    pageSize,
    activeFilters,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.publishingCenter.eyebrow}
        title={messages.publishingCenter.title}
        description={messages.publishingCenter.description}
        badge={
          drafts
            ? formatMessage(messages.publishingCenter.badge, {
                count: drafts.total,
              })
            : undefined
        }
        actions={
          <Link
            href="/reports"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#2d4d3f] px-5 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
          >
            {messages.publishingCenter.createFromReports}
          </Link>
        }
      />

      <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
        <CardHeader className="gap-3">
          <CardTitle className="text-2xl">
            {messages.publishingCenter.filterTitle}
          </CardTitle>
          <CardDescription className="leading-6">
            {messages.publishingCenter.filterDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action="/publishing"
            className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end"
          >
            <input type="hidden" name="pageSize" value={String(pageSize)} />
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="publishing-source-type-filter"
              >
                {messages.publishingCenter.sourceTypeLabel}
              </label>
              <select
                id="publishing-source-type-filter"
                name="sourceType"
                defaultValue={activeFilters.sourceType ?? ""}
                className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
              >
                <option value="">{messages.publishingCenter.allSourceTypes}</option>
                <option value="ARCHIVE">
                  {messages.enums.publishDraftSourceType.ARCHIVE}
                </option>
                <option value="REPORT">
                  {messages.enums.publishDraftSourceType.REPORT}
                </option>
                <option value="MIXED">
                  {messages.enums.publishDraftSourceType.MIXED}
                </option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="publishing-status-filter"
              >
                {messages.publishingCenter.statusLabel}
              </label>
              <select
                id="publishing-status-filter"
                name="status"
                defaultValue={activeFilters.status ?? ""}
                className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
              >
                <option value="">{messages.publishingCenter.allStatuses}</option>
                <option value="DRAFT">
                  {messages.enums.publishDraftStatus.DRAFT}
                </option>
                <option value="READY">
                  {messages.enums.publishDraftStatus.READY}
                </option>
                <option value="PUBLISHED_PARTIAL">
                  {messages.enums.publishDraftStatus.PUBLISHED_PARTIAL}
                </option>
                <option value="PUBLISHED_ALL">
                  {messages.enums.publishDraftStatus.PUBLISHED_ALL}
                </option>
                <option value="FAILED">
                  {messages.enums.publishDraftStatus.FAILED}
                </option>
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#2d4d3f] px-5 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            >
              {messages.publishingCenter.applyFilters}
            </button>
            <Link
              href={resetHref ? `/publishing?${resetHref}` : "/publishing"}
              className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.publishingCenter.clearFilters}
            </Link>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <ErrorState
          title={messages.publishingCenter.errorTitle}
          description={error}
          action={
            <Link
              href="/reports"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.publishingCenter.createFromReports}
            </Link>
          }
        />
      ) : null}

      {drafts && drafts.items.length === 0 ? (
        <EmptyState
          title={messages.publishingCenter.emptyTitle}
          description={messages.publishingCenter.emptyDescription}
          action={
            <Link
              href="/reports"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#2d4d3f] px-5 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            >
              {messages.publishingCenter.emptyAction}
            </Link>
          }
        />
      ) : null}

      {drafts && drafts.items.length > 0 ? (
        <div className="space-y-4">
          {drafts.items.map((draft) => (
            <Card
              key={draft.id}
              className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.28)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]"
            >
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
                  <Badge className="rounded-full bg-[#fcfaf5] text-muted-foreground dark:bg-white/10 dark:text-white/70">
                    {messages.publishingCenter.updatedAtLabel}{" "}
                    {formatDateTime(draft.updatedAt, locale)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{draft.title}</CardTitle>
                  <CardDescription className="leading-6">
                    {draft.summary ?? messages.publishingCenter.noSummary}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end justify-between gap-4">
                <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
                  <div className="rounded-3xl bg-[#f5efe4] px-4 py-3 dark:bg-[#3d3124]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">
                      {messages.publishingCenter.sourceCountLabel}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {draft.sourceSnapshot.reportIds.length +
                        draft.sourceSnapshot.archivedPostIds.length}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#eef4f0] px-4 py-3 dark:bg-[#223228]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f] dark:text-[#d8e2db]">
                      {messages.publishingCenter.targetChannelsLabel}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {draft._count.targetChannels}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {messages.publishingCenter.jobsCountLabel}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {draft._count.publishJobs}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/publishing/drafts/${draft.id}`}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                >
                  {messages.publishingCenter.viewDetail}
                </Link>
              </CardContent>
            </Card>
          ))}

          {drafts.total > drafts.pageSize ? (
            <PaginationNav
              basePath="/publishing"
              locale={locale}
              page={drafts.page}
              pageSize={drafts.pageSize}
              query={{
                sourceType: activeFilters.sourceType,
                status: activeFilters.status,
              }}
              total={drafts.total}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
