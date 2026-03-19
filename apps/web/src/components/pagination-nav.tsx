import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

type PaginationNavProps = {
  basePath: string;
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
  page,
  pageSize,
  query,
  total,
}: PaginationNavProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_20px_60px_-40px_rgba(87,62,22,0.25)]">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            第 {page} / {totalPages} 页
          </p>
          <p className="mt-1 text-sm text-muted-foreground">共 {total} 条记录</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {hasPreviousPage ? (
            <Link
              href={buildPageHref(basePath, page - 1, pageSize, query)}
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              上一页
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center justify-center rounded-full border border-border/70 bg-muted/40 px-4 text-sm font-medium text-muted-foreground">
              上一页
            </span>
          )}
          {hasNextPage ? (
            <Link
              href={buildPageHref(basePath, page + 1, pageSize, query)}
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d]"
            >
              下一页
            </Link>
          ) : (
            <span className="inline-flex h-9 items-center justify-center rounded-full bg-[#eef4f0] px-4 text-sm font-medium text-[#2d4d3f]">
              已到底
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
