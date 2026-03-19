import Link from "next/link";
import { Activity, ExternalLink, Orbit, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { getIntlLocale, type Locale } from "@/lib/i18n";
import { getRequestMessages } from "@/lib/request-locale";

type RunsPageProps = {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

type RunListItem = {
  id: string;
  triggerType: "MANUAL" | "SCHEDULED" | "RETRY";
  status: "QUEUED" | "RUNNING" | "SUCCESS" | "PARTIAL_FAILED" | "FAILED" | "CANCELLED";
  startedAt: string | null;
  finishedAt: string | null;
  fetchedCount: number;
  newCount: number;
  skippedCount: number;
  failedCount: number;
  errorMessage: string | null;
  createdAt: string;
  binding: {
    id: string;
    username: string;
    status: "ACTIVE" | "DISABLED" | "INVALID" | "PENDING";
  };
};

type RunsListResponse = {
  items: RunListItem[];
  page: number;
  pageSize: number;
  total: number;
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function formatDateTime(value: string | null | undefined, locale: Locale, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRunStatusClassName(status: RunListItem["status"]) {
  const classNameMap = {
    QUEUED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
    RUNNING: "bg-[#7f5a26] text-white dark:bg-[#4b3a1e] dark:text-[#f2c58c]",
    SUCCESS: "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]",
    PARTIAL_FAILED: "bg-[#b95c00] text-white dark:bg-[#5a2e00] dark:text-[#ffd1a1]",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200",
    CANCELLED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
  } as const;

  return classNameMap[status];
}

async function getRunsList(page: number, pageSize: number) {
  const { messages } = await getRequestMessages();

  try {
    const payload = await apiRequest<RunsListResponse>({
      path: `/runs?page=${page}&pageSize=${pageSize}`,
      method: "GET",
    });

    return {
      error: null,
      payload,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
      payload: null,
    };
  }
}

export default async function RunsPage({ searchParams }: RunsPageProps) {
  const { locale, messages } = await getRequestMessages();
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = parsePositiveInt(resolvedSearchParams.page, 1);
  const pageSize = parsePositiveInt(resolvedSearchParams.pageSize, 8);
  const { error, payload } = await getRunsList(page, pageSize);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.runs.eyebrow}
        title={messages.runs.title}
        description={messages.runs.description}
        badge={payload ? `${payload.total} ${messages.common.runCountLabel}` : undefined}
      />

      {error ? (
        <ErrorState
          title={messages.runs.errorTitle}
          description={error}
          action={
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.runs.errorAction}
            </Link>
          }
        />
      ) : null}

      {payload && payload.items.length === 0 ? (
        <EmptyState
          title={messages.runs.emptyTitle}
          description={messages.runs.emptyDescription}
          action={
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#7f5a26] px-4 text-sm font-medium text-white transition-colors hover:bg-[#65471f] dark:bg-[#f2c58c] dark:text-[#2c2114] dark:hover:bg-[#e5b775]"
            >
              {messages.runs.emptyAction}
            </Link>
          }
        />
      ) : null}

      {payload && payload.items.length > 0 ? (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            {payload.items.map((item) => (
              <Card
                key={item.id}
                className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.25)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]"
              >
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`rounded-full ${getRunStatusClassName(item.status)}`}>
                      {messages.enums.runStatus[item.status]}
                    </Badge>
                    <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                      {messages.enums.triggerType[item.triggerType]}
                    </Badge>
                    <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                      {messages.runs.createdAt} {formatDateTime(item.createdAt, locale, messages.common.notRecorded)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{messages.runs.bindingAccount} @{item.binding.username}</CardTitle>
                    <CardDescription className="leading-6">
                      {messages.runs.startedAt}：{formatDateTime(item.startedAt, locale, messages.common.notRecorded)} · {messages.runs.finishedAt}：{formatDateTime(item.finishedAt, locale, messages.common.notRecorded)}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <div className="rounded-2xl bg-[#f5efe4] px-4 py-4 dark:bg-[#3d3124]">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">{messages.runs.fetched}</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {item.fetchedCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#eef4f0] px-4 py-4 dark:bg-[#223228]">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f] dark:text-[#d8e2db]">{messages.runs.newCount}</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {item.newCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4 dark:bg-white/8">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{messages.runs.skipped}</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {item.skippedCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-red-50 px-4 py-4 dark:bg-red-950/30">
                      <p className="text-xs uppercase tracking-[0.2em] text-red-600 dark:text-red-200">{messages.runs.failed}</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {item.failedCount}
                      </p>
                    </div>
                  </div>

                  {item.errorMessage ? (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-100">
                      <div className="flex items-center gap-2 font-medium">
                        <ShieldAlert className="size-4" />
                        {messages.runs.errorSummary}
                      </div>
                      <p className="mt-2 leading-6">{item.errorMessage}</p>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-950/30 dark:text-emerald-100">
                      <div className="flex items-center gap-2 font-medium">
                        <Activity className="size-4" />
                        {messages.runs.noErrorSummary}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/runs/${item.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                    >
                      {messages.common.viewDetails}
                    </Link>
                    <Link
                      href="/bindings"
                      className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
                    >
                      <Orbit className="mr-2 size-4" />
                      {messages.runs.backToBindings}
                    </Link>
                    <span className="inline-flex h-9 items-center justify-center rounded-full bg-muted/60 px-4 text-sm text-muted-foreground">
                      <ExternalLink className="mr-2 size-4" />
                      {messages.common.runId}: {item.id.slice(0, 8)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <PaginationNav
            basePath="/runs"
            locale={locale}
            page={payload.page}
            pageSize={payload.pageSize}
            total={payload.total}
          />
        </>
      ) : null}
    </div>
  );
}
