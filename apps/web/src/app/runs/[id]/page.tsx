import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, DatabaseZap, ExternalLink, FileWarning } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiRequestError, apiRequest, getApiErrorMessage } from "@/lib/api-client";

type RunDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RunDetailResponse = {
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
  errorDetail: unknown;
  createdAt: string;
  binding: {
    id: string;
    username: string;
    displayName: string | null;
    status: "ACTIVE" | "DISABLED" | "INVALID" | "PENDING";
  };
  crawlJob: null | {
    id: string;
    enabled: boolean;
    intervalMinutes: number;
    nextRunAt: string | null;
  };
  runPosts: Array<{
    id: string;
    xPostId: string;
    actionType: "CREATED" | "SKIPPED" | "FAILED";
    reason: string | null;
    createdAt: string;
    archivedPost: null | {
      id: string;
      authorUsername: string;
      postType: "POST" | "REPOST" | "QUOTE" | "REPLY";
      postUrl: string;
    };
  }>;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRunStatusClassName(status: RunDetailResponse["status"]) {
  const classNameMap = {
    QUEUED: "bg-slate-200 text-slate-700",
    RUNNING: "bg-[#7f5a26] text-white",
    SUCCESS: "bg-[#2d4d3f] text-white",
    PARTIAL_FAILED: "bg-[#b95c00] text-white",
    FAILED: "bg-red-100 text-red-700",
    CANCELLED: "bg-slate-200 text-slate-700",
  } as const;

  return classNameMap[status];
}

function getActionTypeClassName(actionType: RunDetailResponse["runPosts"][number]["actionType"]) {
  const classNameMap = {
    CREATED: "bg-[#2d4d3f] text-white",
    SKIPPED: "bg-[#7f5a26] text-white",
    FAILED: "bg-red-100 text-red-700",
  } as const;

  return classNameMap[actionType];
}

function formatErrorDetail(value: unknown) {
  if (!value) {
    return null;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function getRunDetail(id: string) {
  try {
    const run = await apiRequest<RunDetailResponse>({
      path: `/runs/${id}`,
      method: "GET",
    });

    return {
      error: null,
      run,
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }

    return {
      error: getApiErrorMessage(error, "抓取记录详情加载失败，请稍后重试。"),
      run: null,
    };
  }
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { id } = await params;
  const { error, run } = await getRunDetail(id);
  const formattedErrorDetail = run ? formatErrorDetail(run.errorDetail) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Run Detail"
        title={run ? `Run ${run.id.slice(0, 8)}` : "Run Detail"}
        description={
          run
            ? "这里展示单次抓取的状态、统计结果、错误信息和每条帖子处理结果。"
            : "执行详情正在准备中。"
        }
        badge={run?.status}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/runs"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="mr-2 size-4" />
              返回列表
            </Link>
            {run?.binding ? (
              <Link
                href="/bindings"
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d]"
              >
                查看绑定
              </Link>
            ) : null}
          </div>
        }
      />

      {error ? (
        <ErrorState
          title="抓取记录详情暂时不可用"
          description={error}
          action={
            <Link
              href="/runs"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              返回执行记录列表
            </Link>
          }
        />
      ) : null}

      {run ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.26)]">
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`rounded-full ${getRunStatusClassName(run.status)}`}>
                    {run.status}
                  </Badge>
                  <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f]">
                    {run.triggerType}
                  </Badge>
                  <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26]">
                    创建于 {formatDateTime(run.createdAt)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-3xl">绑定账号 @{run.binding.username}</CardTitle>
                  <CardDescription className="leading-6">
                    开始：{formatDateTime(run.startedAt)} · 结束：{formatDateTime(run.finishedAt)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-[#f5efe4] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">抓取总数</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{run.fetchedCount}</p>
                  </div>
                  <div className="rounded-2xl bg-[#eef4f0] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f]">新增归档</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{run.newCount}</p>
                  </div>
                  <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">跳过数量</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{run.skippedCount}</p>
                  </div>
                  <div className="rounded-2xl bg-red-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-red-600">失败数量</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{run.failedCount}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef4f0] text-[#2d4d3f]">
                      <DatabaseZap className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">处理项列表</h2>
                      <p className="text-sm text-muted-foreground">
                        每条推荐帖子都会在这里留下 `CREATED`、`SKIPPED` 或 `FAILED` 结果。
                      </p>
                    </div>
                  </div>

                  {run.runPosts.length > 0 ? (
                    <div className="space-y-3">
                      {run.runPosts.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge className={`rounded-full ${getActionTypeClassName(item.actionType)}`}>
                              {item.actionType}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              xPostId: {item.xPostId}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              记录时间：{formatDateTime(item.createdAt)}
                            </span>
                          </div>

                          {item.reason ? (
                            <p className="mt-3 text-sm leading-6 text-foreground">{item.reason}</p>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-3">
                            {item.archivedPost ? (
                              <>
                                <Link
                                  href={`/archives/${item.archivedPost.id}`}
                                  className="inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                  查看归档详情
                                </Link>
                                <Link
                                  href={item.archivedPost.postUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                  <ExternalLink className="mr-2 size-3.5" />
                                  打开原帖
                                </Link>
                              </>
                            ) : (
                              <span className="inline-flex h-8 items-center justify-center rounded-full bg-muted/60 px-3 text-xs text-muted-foreground">
                                该处理项没有归档实体
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="当前执行还没有处理项记录"
                      description="如果任务仍在排队或运行中，处理项会随着归档流程继续写入。"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.24)]">
              <CardHeader>
                <CardTitle className="text-2xl">执行上下文</CardTitle>
                <CardDescription className="leading-6">
                  用于确认本次运行归属于哪个绑定、哪个调度任务，以及当前调度配置状态。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-[#f5efe4] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">Binding</p>
                  <p className="mt-2 text-sm font-medium text-foreground">@{run.binding.username}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {run.binding.displayName ?? "未填写显示名"} · {run.binding.status}
                  </p>
                </div>

                {run.crawlJob ? (
                  <div className="rounded-3xl bg-[#eef4f0] p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f]">Crawl Job</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {run.crawlJob.enabled ? "已启用" : "已停用"} · 每 {run.crawlJob.intervalMinutes} 分钟
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      下一次执行：{formatDateTime(run.crawlJob.nextRunAt)}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(185,92,0,0.2)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-[#b95c00]">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">错误信息</CardTitle>
                    <CardDescription className="leading-6">
                      若本次执行出现整体失败或部分失败，这里会展示摘要和结构化错误详情。
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {run.errorMessage ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                    <p className="font-medium">错误摘要</p>
                    <p className="mt-2 leading-6">{run.errorMessage}</p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                    <div className="flex items-center gap-2 font-medium">
                      <Activity className="size-4" />
                      当前执行没有记录错误摘要
                    </div>
                  </div>
                )}

                {formattedErrorDetail ? (
                  <div className="rounded-3xl border border-border/70 bg-[#1f3128] p-5 text-sm text-white">
                    <div className="flex items-center gap-2 font-medium text-white/80">
                      <FileWarning className="size-4" />
                      errorDetail
                    </div>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-white/90">
                      {formattedErrorDetail}
                    </pre>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-border/70 bg-[#fcfaf5] px-5 py-4 text-sm text-muted-foreground">
                    当前没有结构化 `errorDetail` 数据。
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </div>
  );
}
