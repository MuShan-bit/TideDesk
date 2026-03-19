"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  disableBindingAction,
  revalidateBindingAction,
  type BindingActionState,
  triggerManualCrawlAction,
  updateCrawlConfigAction,
  upsertBindingAction,
} from "./actions";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type BindingRecord = {
  id: string;
  xUserId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: "ACTIVE" | "DISABLED" | "INVALID" | "PENDING";
  credentialSource: "COOKIE_IMPORT" | "EXTENSION" | "WEB_LOGIN";
  crawlEnabled: boolean;
  crawlIntervalMinutes: number;
  lastValidatedAt: string | null;
  lastCrawledAt: string | null;
  nextCrawlAt: string | null;
  lastErrorMessage: string | null;
  updatedAt: string;
  crawlJob:
    | {
        enabled: boolean;
        intervalMinutes: number;
        lastRunAt: string | null;
        nextRunAt: string | null;
      }
    | null;
    };

type BindingConsoleProps = {
  currentBinding: BindingRecord | null;
};

const initialActionState: BindingActionState = {};

const credentialSourceOptions = [
  { value: "WEB_LOGIN", label: "网页登录态" },
  { value: "COOKIE_IMPORT", label: "Cookie 导入" },
  { value: "EXTENSION", label: "扩展采集" },
] as const;

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: BindingRecord["status"] | "UNBOUND" }) {
  const className = {
    ACTIVE: "bg-[#2d4d3f] text-white",
    INVALID: "bg-[#b95c00] text-white",
    DISABLED: "bg-slate-200 text-slate-700",
    PENDING: "bg-[#7f5a26] text-white",
    UNBOUND: "bg-[#f4ebdb] text-[#7f5a26]",
  }[status];

  return <Badge className={cn("rounded-full", className)}>{status}</Badge>;
}

function FormFeedback({
  state,
}: {
  state: BindingActionState;
}) {
  if (state.error) {
    return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p>;
  }

  if (state.success) {
    return (
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <p>{state.success}</p>
        {state.actionHref && state.actionLabel ? (
          <Link
            href={state.actionHref}
            className="mt-3 inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            {state.actionLabel}
          </Link>
        ) : null}
      </div>
    );
  }

  return null;
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function BindingConsole({ currentBinding }: BindingConsoleProps) {
  const [upsertState, upsertAction, isUpserting] = useActionState(
    upsertBindingAction,
    initialActionState,
  );
  const [configState, configAction, isConfigPending] = useActionState(
    updateCrawlConfigAction,
    initialActionState,
  );
  const [validateState, validateAction, isValidatePending] = useActionState(
    revalidateBindingAction,
    initialActionState,
  );
  const [manualCrawlState, manualCrawlAction, isManualCrawlPending] = useActionState(
    triggerManualCrawlAction,
    initialActionState,
  );
  const [disableState, disableAction, isDisablePending] = useActionState(
    disableBindingAction,
    initialActionState,
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-6">
        <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)]">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-2xl">当前绑定状态</CardTitle>
              <StatusBadge status={currentBinding?.status ?? "UNBOUND"} />
            </div>
            <CardDescription className="leading-6">
              这里会持续展示当前绑定账号、抓取开关、校验结果和下一次执行时间。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {currentBinding ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-[#f5efe4] p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#7f5a26]">
                      Username
                    </p>
                    <p className="mt-2 text-base font-medium text-foreground">
                      @{currentBinding.username}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {currentBinding.displayName ?? "未填写显示名"}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-[#eef4f0] p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#2d4d3f]">
                      X User Id
                    </p>
                    <p className="mt-2 font-mono text-sm text-foreground">{currentBinding.xUserId}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      凭证来源：{credentialSourceOptions.find((item) => item.value === currentBinding.credentialSource)?.label}
                    </p>
                  </div>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      最近校验
                    </dt>
                    <dd className="mt-1 text-foreground">{formatDateTime(currentBinding.lastValidatedAt)}</dd>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      下一次抓取
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {formatDateTime(currentBinding.crawlJob?.nextRunAt ?? currentBinding.nextCrawlAt)}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      自动抓取
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {currentBinding.crawlEnabled ? "已开启" : "已关闭"}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3">
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      抓取周期
                    </dt>
                    <dd className="mt-1 text-foreground">
                      每 {currentBinding.crawlIntervalMinutes} 分钟
                    </dd>
                  </div>
                </dl>
                {currentBinding.lastErrorMessage ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                    <p className="font-medium">最近错误</p>
                    <p className="mt-2 leading-6">{currentBinding.lastErrorMessage}</p>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                title="还没有绑定 X 账号"
                description="先在右侧提交账号信息和抓取凭证。提交后，这里会展示绑定状态、抓取配置和校验结果。"
              />
            )}
          </CardContent>
        </Card>

        {currentBinding ? (
          <>
            <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.28)]">
              <CardHeader>
                <CardTitle className="text-xl">抓取配置</CardTitle>
                <CardDescription>单独调整抓取开关和抓取周期，不需要重新粘贴凭证。</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={configAction} className="space-y-5">
                  <input type="hidden" name="bindingId" value={currentBinding.id} />
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-[#f8faf8] px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">自动抓取</p>
                      <p className="text-sm text-muted-foreground">
                        关闭后将不再自动安排下一次抓取。
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      name="crawlEnabled"
                      defaultChecked={currentBinding.crawlEnabled}
                      className="h-4 w-4 rounded border-border text-[#2d4d3f] focus:ring-[#2d4d3f]"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="crawlIntervalMinutes">抓取周期（分钟）</FieldLabel>
                    <Input
                      id="crawlIntervalMinutes"
                      name="crawlIntervalMinutes"
                      type="number"
                      min={5}
                      max={1440}
                      defaultValue={String(currentBinding.crawlIntervalMinutes)}
                      className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4"
                    />
                  </div>
                  <FormFeedback state={configState} />
                  <Button
                    type="submit"
                    className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d]"
                    disabled={isConfigPending}
                  >
                    {isConfigPending ? "保存中..." : "保存抓取配置"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.2)]">
              <CardHeader>
                <CardTitle className="text-xl">绑定操作</CardTitle>
                <CardDescription>这里可以立即触发一次抓取、重新校验凭证，或停用当前绑定。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={manualCrawlAction} className="space-y-3">
                  <input type="hidden" name="bindingId" value={currentBinding.id} />
                  <Button
                    type="submit"
                    className="rounded-full bg-[#7f5a26] px-5 hover:bg-[#65471f]"
                    disabled={isManualCrawlPending || currentBinding.status !== "ACTIVE"}
                  >
                    {isManualCrawlPending ? "抓取中..." : "立即抓取"}
                  </Button>
                  <FormFeedback state={manualCrawlState} />
                </form>
                <form action={validateAction} className="space-y-3">
                  <input type="hidden" name="bindingId" value={currentBinding.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    className="rounded-full px-5"
                    disabled={isValidatePending}
                  >
                    {isValidatePending ? "校验中..." : "重新校验绑定"}
                  </Button>
                  <FormFeedback state={validateState} />
                </form>
                <form action={disableAction} className="space-y-3">
                  <input type="hidden" name="bindingId" value={currentBinding.id} />
                  <Button
                    type="submit"
                    variant="destructive"
                    className="rounded-full px-5"
                    disabled={isDisablePending || currentBinding.status === "DISABLED"}
                  >
                    {isDisablePending ? "停用中..." : "停用绑定"}
                  </Button>
                  <FormFeedback state={disableState} />
                </form>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.3)]">
        <CardHeader>
          <CardTitle className="text-2xl">
            {currentBinding ? "更新绑定资料与凭证" : "创建第一个绑定"}
          </CardTitle>
          <CardDescription className="leading-6">
            {currentBinding
              ? "如果需要替换登录态或修正账号信息，可以重新提交一份完整的绑定数据。当前凭证不会回显，因此需要重新粘贴。"
              : "MVP 阶段先使用结构化表单录入绑定数据；后续可以在此处替换为真实登录态采集流程。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertAction} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="xUserId">X 用户 ID</FieldLabel>
                <Input
                  id="xUserId"
                  name="xUserId"
                  defaultValue={currentBinding?.xUserId ?? ""}
                  placeholder="例如 44196397"
                  className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="username">用户名</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  defaultValue={currentBinding?.username ?? ""}
                  placeholder="例如 openai"
                  className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="displayName">显示名</FieldLabel>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={currentBinding?.displayName ?? ""}
                  placeholder="例如 OpenAI"
                  className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="avatarUrl">头像 URL</FieldLabel>
                <Input
                  id="avatarUrl"
                  name="avatarUrl"
                  defaultValue={currentBinding?.avatarUrl ?? ""}
                  placeholder="https://..."
                  className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="credentialSource">凭证来源</FieldLabel>
              <select
                id="credentialSource"
                name="credentialSource"
                defaultValue={currentBinding?.credentialSource ?? "WEB_LOGIN"}
                className="h-11 w-full rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 text-sm text-foreground outline-none ring-0 transition focus:border-ring focus:ring-3 focus:ring-ring/40"
              >
                {credentialSourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="credentialPayload">抓取凭证</FieldLabel>
              <textarea
                id="credentialPayload"
                name="credentialPayload"
                rows={8}
                placeholder='例如 {"cookie":"demo","username":"demo_x_user"}'
                className="w-full rounded-[1.5rem] border border-border/70 bg-[#fcfaf5] px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40"
              />
              <p className="text-sm leading-6 text-muted-foreground">
                当前示例默认使用 JSON 凭证。Mock 适配器至少需要 `cookie`、`username` 或 `xUserId`
                其中之一。
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
              <div className="flex items-center justify-between rounded-[1.5rem] border border-border/70 bg-[#f8faf8] px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">提交后立即启用自动抓取</p>
                  <p className="text-sm text-muted-foreground">如果暂时只想保存凭证，也可以先关闭。</p>
                </div>
                <input
                  type="checkbox"
                  name="crawlEnabled"
                  defaultChecked={currentBinding?.crawlEnabled ?? true}
                  className="h-4 w-4 rounded border-border text-[#2d4d3f] focus:ring-[#2d4d3f]"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="bindingCrawlIntervalMinutes">抓取周期（分钟）</FieldLabel>
                <Input
                  id="bindingCrawlIntervalMinutes"
                  name="crawlIntervalMinutes"
                  type="number"
                  min={5}
                  max={1440}
                  defaultValue={String(currentBinding?.crawlIntervalMinutes ?? 60)}
                  className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4"
                />
              </div>
            </div>

            <FormFeedback state={upsertState} />
            <Button
              type="submit"
              className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d]"
              disabled={isUpserting}
            >
              {isUpserting
                ? "提交中..."
                : currentBinding
                  ? "更新绑定与凭证"
                  : "创建绑定"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
