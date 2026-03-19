import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, GalleryVerticalEnd, Languages, Link2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiRequestError, apiRequest, getApiErrorMessage } from "@/lib/api-client";

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
  mediaItems: Array<{
    id: string;
    mediaType: "IMAGE" | "VIDEO" | "GIF";
    sourceUrl: string;
    previewUrl: string | null;
    width: number | null;
    height: number | null;
    durationMs: number | null;
  }>;
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
    status: string;
    triggerType: string;
  };
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
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
      error: getApiErrorMessage(error, "归档详情加载失败，请稍后重试。"),
    };
  }
}

export default async function ArchiveDetailPage({ params }: ArchiveDetailPageProps) {
  const { id } = await params;
  const { archive, error } = await getArchiveDetail(id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Archive Detail"
        title={archive ? `@${archive.authorUsername}` : "Archive Detail"}
        description={
          archive
            ? "这里展示归档富文本正文、媒体资源、来源链接和本次归档的上下文信息。"
            : "归档详情正在准备中。"
        }
        badge={archive?.postType}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/archives"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="mr-2 size-4" />
              返回列表
            </Link>
            {archive ? (
              <Link
                href={archive.postUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d]"
              >
                <ExternalLink className="mr-2 size-4" />
                打开原帖
              </Link>
            ) : null}
          </div>
        }
      />

      {error ? (
        <ErrorState
          title="归档详情暂时不可用"
          description={error}
          action={
            <Link
              href="/archives"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              返回归档列表
            </Link>
          }
        />
      ) : null}

      {archive ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.28)]">
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="rounded-full bg-[#2d4d3f] text-white">{archive.postType}</Badge>
                  <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26]">
                    归档于 {formatDateTime(archive.archivedAt)}
                  </Badge>
                  {archive.language ? (
                    <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f]">
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
                    来源绑定账号：@{archive.binding.username} · 原帖发布时间：{formatDateTime(archive.sourceCreatedAt)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <article
                  className="rounded-[2rem] bg-[#fcfaf5] p-6 text-sm text-foreground [&_a]:font-medium [&_a]:text-[#2d4d3f] [&_a]:underline-offset-4 hover:[&_a]:underline [&_figure]:overflow-hidden [&_figure]:rounded-3xl [&_figure]:border [&_figure]:border-border/70 [&_figure]:bg-white [&_figure]:p-3 [&_img]:w-full [&_img]:rounded-2xl [&_p]:leading-8 [&_video]:w-full [&_video]:rounded-2xl"
                  dangerouslySetInnerHTML={{
                    __html:
                      archive.renderedHtml ??
                      `<p>${archive.rawText.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`,
                  }}
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-[#f5efe4] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">回复</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatMetric(archive.replyCount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#eef4f0] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f]">转推</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatMetric(archive.repostCount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">引用</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatMetric(archive.quoteCount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-rose-600">喜欢 / 浏览</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatMetric(archive.favoriteCount)} / {formatMetric(archive.viewCount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.24)]">
              <CardHeader>
                <CardTitle className="text-2xl">来源与上下文</CardTitle>
                <CardDescription className="leading-6">
                  这里保留原帖链接、绑定来源和首次归档执行记录，方便回溯抓取过程。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-[#f5efe4] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">Original Post</p>
                  <Link
                    href={archive.postUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center text-sm font-medium text-foreground underline decoration-border underline-offset-4"
                  >
                    <Link2 className="mr-2 size-4" />
                    {archive.postUrl}
                  </Link>
                </div>
                <div className="rounded-3xl bg-[#eef4f0] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f]">Binding</p>
                  <p className="mt-2 text-sm font-medium text-foreground">@{archive.binding.username}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {archive.binding.displayName ?? "未填写显示名"}
                  </p>
                </div>
                {archive.firstCrawlRun ? (
                  <div className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      First Crawl Run
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {archive.firstCrawlRun.status} · {archive.firstCrawlRun.triggerType}
                    </p>
                    <Link
                      href={`/runs/${archive.firstCrawlRun.id}`}
                      className="mt-3 inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      查看本次执行记录
                    </Link>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef4f0] text-[#2d4d3f]">
                    <GalleryVerticalEnd className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">媒体与关联</CardTitle>
                    <CardDescription className="leading-6">
                      展示归档中的媒体资源入口和引用关系，便于二次处理与回查。
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
                        className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-4"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className="rounded-full bg-[#2d4d3f] text-white">
                            {item.mediaType}
                          </Badge>
                          <span className="text-sm text-muted-foreground">媒体 {index + 1}</span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {item.width && item.height ? `${item.width} x ${item.height}` : "尺寸未知"}
                          {item.durationMs ? ` · ${Math.round(item.durationMs / 1000)} 秒` : ""}
                        </p>
                        <Link
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center text-sm font-medium text-foreground underline decoration-border underline-offset-4"
                        >
                          <ExternalLink className="mr-2 size-4" />
                          打开媒体资源
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="这条归档没有媒体资源"
                    description="当前帖子只包含文本内容，富文本正文中不会出现图片或视频块。"
                  />
                )}

                {archive.relations.length > 0 ? (
                  <div className="space-y-3">
                    {archive.relations.map((relation) => (
                      <div
                        key={relation.id}
                        className="rounded-3xl border border-border/70 bg-white px-4 py-4"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge className="rounded-full bg-[#7f5a26] text-white">
                            {relation.relationType}
                          </Badge>
                          <p className="text-sm text-foreground">
                            {relation.targetAuthorUsername
                              ? `目标作者：@${relation.targetAuthorUsername}`
                              : "未记录目标作者"}
                          </p>
                        </div>
                        {relation.targetUrl ? (
                          <Link
                            href={relation.targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center text-sm font-medium text-foreground underline decoration-border underline-offset-4"
                          >
                            <ExternalLink className="mr-2 size-4" />
                            打开关联原帖
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
