import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatMessage, getMessages, type Locale } from "@/lib/i18n";

type PaginationNavProps = {
  basePath: string;
  locale: Locale;
  page: number;
  pageSize: number;
  query?: Record<string, string | undefined>;
  total: number;
};

function buildPageHref(
  basePath: string,
  page: number,
  pageSize: number,
  query?: Record<string, string | undefined>,
) {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (!value) {
        continue;
      }

      searchParams.set(key, value);
    }
  }

  return `${basePath}?${searchParams.toString()}`;
}

export function PaginationNav({
  basePath,
  locale,
  page,
  pageSize,
  query,
  total,
}: PaginationNavProps) {
  const messages = getMessages(locale);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <Card className="rounded-[1.75rem] border-border/70 bg-white/90 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_20px_60px_-40px_rgba(0,0,0,0.45)]">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatMessage(messages.pagination.pageSummary, { page, totalPages })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMessage(messages.pagination.totalRecords, { total })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasPreviousPage ? (
            <Link
              href={buildPageHref(basePath, page - 1, pageSize, query)}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-sky-50 dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.pagination.previous}
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 bg-muted/40 px-4 text-sm font-medium text-muted-foreground dark:border-white/10 dark:bg-white/8">
              {messages.pagination.previous}
            </span>
          )}
          {hasNextPage ? (
            <Link
              href={buildPageHref(basePath, page + 1, pageSize, query)}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] px-4 text-sm font-medium text-white transition hover:brightness-105"
            >
              {messages.pagination.next}
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-full bg-[#edf6fb] px-4 text-sm font-medium text-[#145375] dark:bg-white/8 dark:text-sky-200">
              {messages.pagination.reachedEnd}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
