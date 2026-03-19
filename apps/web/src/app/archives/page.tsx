import Link from "next/link";
import { Archive, ImageIcon, Link2, MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";

const archivePostTypes = ["POST", "REPOST", "QUOTE", "REPLY"] as const;

type ArchivesPageProps = {
  searchParams?: Promise<{
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
    postType?: string;
  }>;
};

type ArchiveListItem = {
  id: string;
  postType: "POST" | "REPOST" | "QUOTE" | "REPLY";
  postUrl: string;
  authorUsername: string;
  authorDisplayName: string | null;
  rawText: string;
  sourceCreatedAt: string;
  archivedAt: string;
  mediaItems: Array<{
    id: string;
    mediaType: "IMAGE" | "VIDEO" | "GIF";
    sourceUrl: string;
  }>;
  binding: {
    id: string;
    username: string;
  };
};

type ArchivesListResponse = {
  items: ArchiveListItem[];
  page: number;
  pageSize: number;
  total: number;
};

type ArchiveFilters = {
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  page?: string;
  pageSize?: string;
  postType?: (typeof archivePostTypes)[number];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

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

function getSingleQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizePostType(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return archivePostTypes.includes(value as (typeof archivePostTypes)[number])
    ? (value as (typeof archivePostTypes)[number])
    : undefined;
}

function buildArchivesQueryString(filters: ArchiveFilters) {
  const searchParams = new URLSearchParams();

  const entries = Object.entries(filters);

  for (const [key, value] of entries) {
    if (!value) {
      continue;
    }

    searchParams.set(key, value);
  }

  return searchParams.toString();
}

function getMediaSummary(mediaItems: ArchiveListItem["mediaItems"]) {
  if (mediaItems.length === 0) {
    return "无媒体";
  }

  const groupedCount = mediaItems.reduce<Record<string, number>>((result, item) => {
    result[item.mediaType] = (result[item.mediaType] ?? 0) + 1;

    return result;
  }, {});

  return Object.entries(groupedCount)
    .map(([type, count]) => `${type} x${count}`)
    .join(" / ");
}

async function getArchivesList(page: number, pageSize: number, filters: ArchiveFilters) {
  try {
    const queryString = buildArchivesQueryString({
      page: String(page),
      pageSize: String(pageSize),
      keyword: filters.keyword,
      postType: filters.postType,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    const payload = await apiRequest<ArchivesListResponse>({
      path: `/archives?${queryString}`,
      method: "GET",
    });

    return {
      error: null,
      payload,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(error, "归档列表加载失败，请稍后重试。"),
      payload: null,
    };
  }
}

export default async function ArchivesPage({ searchParams }: ArchivesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const keyword = getSingleQueryValue(resolvedSearchParams.keyword)?.trim() || undefined;
  const postType = normalizePostType(getSingleQueryValue(resolvedSearchParams.postType));
  const dateFrom = getSingleQueryValue(resolvedSearchParams.dateFrom) || undefined;
  const dateTo = getSingleQueryValue(resolvedSearchParams.dateTo) || undefined;
  const page = parsePositiveInt(getSingleQueryValue(resolvedSearchParams.page), 1);
  const pageSize = parsePositiveInt(getSingleQueryValue(resolvedSearchParams.pageSize), 6);
  const activeFilters = {
    keyword,
    postType,
    dateFrom,
    dateTo,
  } satisfies ArchiveFilters;
  const hasActiveFilters = Boolean(keyword || postType || dateFrom || dateTo);
  const resetHref = buildArchivesQueryString({ pageSize: String(pageSize) });
  const { error, payload } = await getArchivesList(page, pageSize, activeFilters);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Archive"
        title="Archives"
        description="这里按卡片展示已经归档的推荐帖子，支持分页浏览、查看原文来源和进入详情页。"
        badge={payload ? `${payload.total} Posts` : undefined}
      />

      <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.22)]">
        <CardHeader className="gap-3">
          <CardTitle className="text-xl">筛选归档</CardTitle>
          <CardDescription>
            按关键词、帖子类型和时间范围快速收窄结果。筛选提交后会自动从第一页开始展示。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_auto]" method="GET">
            <input type="hidden" name="pageSize" value={String(pageSize)} />
            <Input
              name="keyword"
              defaultValue={keyword}
              placeholder="搜索正文、作者、绑定账号或帖子 ID"
              className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4"
            />
            <select
              name="postType"
              defaultValue={postType ?? ""}
              className="h-11 rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 text-sm text-foreground outline-none transition-colors focus:border-[#2d4d3f]"
            >
              <option value="">全部类型</option>
              {archivePostTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Input
              name="dateFrom"
              type="date"
              defaultValue={dateFrom}
              className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4"
            />
            <Input
              name="dateTo"
              type="date"
              defaultValue={dateTo}
              className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d]">
                应用筛选
              </Button>
              <Link
                href={resetHref ? `/archives?${resetHref}` : "/archives"}
                className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                清空
              </Link>
            </div>
          </form>
          {hasActiveFilters ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {keyword ? (
                <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26]">关键词：{keyword}</Badge>
              ) : null}
              {postType ? (
                <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f]">类型：{postType}</Badge>
              ) : null}
              {dateFrom || dateTo ? (
                <Badge className="rounded-full bg-slate-100 text-slate-700">
                  时间：{dateFrom ?? "起始"} - {dateTo ?? "至今"}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <ErrorState
          title="归档列表加载失败"
          description={error}
          action={
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              先去检查绑定
            </Link>
          }
        />
      ) : null}

      {payload && payload.items.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "没有匹配当前筛选条件的归档" : "还没有归档内容"}
          description={
            hasActiveFilters
              ? "试着放宽关键词、调整类型或修改时间范围，然后重新查询。"
              : "先在绑定页完成账号配置并手动抓取一次，系统就会把推荐帖子存档到这里。"
          }
          action={
            <Link
              href={hasActiveFilters ? (resetHref ? `/archives?${resetHref}` : "/archives") : "/bindings"}
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d]"
            >
              {hasActiveFilters ? "清空筛选" : "去触发抓取"}
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
                className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.25)]"
              >
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="rounded-full bg-[#2d4d3f] text-white">
                      {item.postType}
                    </Badge>
                    <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26]">
                      归档于 {formatDateTime(item.archivedAt)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">
                      @{item.authorUsername}
                      {item.authorDisplayName ? (
                        <span className="ml-2 text-lg font-normal text-muted-foreground">
                          {item.authorDisplayName}
                        </span>
                      ) : null}
                    </CardTitle>
                    <CardDescription className="leading-6">
                      来源绑定账号：@{item.binding.username} · 原帖发布时间：{formatDateTime(item.sourceCreatedAt)}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-3xl bg-[#fcfaf5] p-5">
                    <p className="text-sm leading-7 text-foreground">
                      {truncateText(item.rawText, 220)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-[#eef4f0] px-4 py-4">
                      <div className="flex items-center gap-2 text-[#2d4d3f]">
                        <ImageIcon className="size-4" />
                        <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                          Media
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {getMediaSummary(item.mediaItems)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-[#f5efe4] px-4 py-4">
                      <div className="flex items-center gap-2 text-[#7f5a26]">
                        <Archive className="size-4" />
                        <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                          Archive Id
                        </p>
                      </div>
                      <p className="mt-2 truncate font-mono text-sm text-foreground">{item.id}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/archives/${item.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d]"
                    >
                      查看详情
                    </Link>
                    <Link
                      href={item.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Link2 className="mr-2 size-4" />
                      打开原帖
                    </Link>
                    <span className="inline-flex h-9 items-center justify-center rounded-full bg-muted/60 px-4 text-sm text-muted-foreground">
                      <MessageSquareText className="mr-2 size-4" />
                      {item.mediaItems.length > 0 ? "包含媒体内容" : "文本帖文"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <PaginationNav
            basePath="/archives"
            page={payload.page}
            pageSize={payload.pageSize}
            query={activeFilters}
            total={payload.total}
          />
        </>
      ) : null}
    </div>
  );
}
