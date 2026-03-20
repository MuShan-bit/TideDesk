"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createCrawlProfileAction,
  triggerCrawlProfileAction,
  updateCrawlProfileAction,
  type BindingActionState,
} from "../bindings/actions";
import {
  type BindingRecord,
  type CrawlProfileRecord,
} from "../bindings/binding-types";
import { StrategyScheduleBuilder } from "./strategy-schedule-builder";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  formatMessage,
  getIntlLocale,
  getMessages,
  type Locale,
} from "@/lib/i18n";
import { describeSchedule } from "@/lib/crawl-schedule";
import { cn } from "@/lib/utils";

type StrategyConsoleProps = {
  bindings: BindingRecord[];
  locale: Locale;
};

type StrategyDialogState =
  | {
      type: "create";
    }
  | {
      profileId: string;
      type: "edit";
    }
  | null;

const initialActionState: BindingActionState = {};

function formatDateTime(
  value: string | null | undefined,
  locale: Locale,
  emptyLabel: string,
) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ActionFeedback({ state }: { state: BindingActionState }) {
  const actionLink =
    state.actionHref && state.actionLabel ? (
      <Link
        href={state.actionHref}
        className="mt-3 inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-xs font-medium transition-colors hover:bg-slate-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/14"
      >
        {state.actionLabel}
      </Link>
    ) : null;

  if (state.error) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
        <p>{state.error}</p>
        {actionLink}
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
        <p>{state.success}</p>
        {actionLink}
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

function getNextStrategyRun(binding: BindingRecord) {
  return [...binding.crawlProfiles]
    .filter((profile) => profile.enabled && profile.nextRunAt)
    .sort((left, right) => {
      const leftTime = new Date(left.nextRunAt ?? 0).getTime();
      const rightTime = new Date(right.nextRunAt ?? 0).getTime();

      return leftTime - rightTime;
    })[0]?.nextRunAt;
}

function StrategyDialogForm({
  binding,
  dialogState,
  locale,
  onClose,
}: {
  binding: BindingRecord;
  dialogState: Exclude<StrategyDialogState, null>;
  locale: Locale;
  onClose: () => void;
}) {
  const messages = getMessages(locale);
  const editingProfile =
    dialogState.type === "edit"
      ? (binding.crawlProfiles.find(
          (profile) => profile.id === dialogState.profileId,
        ) ?? null)
      : null;
  const [createState, createAction, isCreatePending] = useActionState(
    createCrawlProfileAction,
    initialActionState,
  );
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateCrawlProfileAction,
    initialActionState,
  );
  const [mode, setMode] = useState<"HOT" | "SEARCH">("HOT");
  const activeState = dialogState.type === "create" ? createState : updateState;
  const isPending =
    dialogState.type === "create" ? isCreatePending : isUpdatePending;
  const scheduleMessages = messages.strategies.scheduleBuilder;

  useEffect(() => {
    if (dialogState.type === "create") {
      setMode("HOT");
      return;
    }

    if (editingProfile?.mode === "SEARCH") {
      setMode("SEARCH");
    } else {
      setMode("HOT");
    }
  }, [dialogState.type, editingProfile?.mode]);

  useEffect(() => {
    if (!activeState.success) {
      return;
    }

    onClose();
  }, [activeState.success, onClose]);

  if (dialogState.type === "edit" && !editingProfile) {
    return null;
  }

  const effectiveMode =
    dialogState.type === "edit" ? editingProfile!.mode : mode;
  const action = dialogState.type === "create" ? createAction : updateAction;
  const dialogTitle =
    dialogState.type === "create"
      ? messages.strategies.createStrategyForAccount.replace(
          "{username}",
          binding.username,
        )
      : messages.strategies.editStrategy;
  const dialogDescription =
    dialogState.type === "create"
      ? messages.strategies.createStrategyDescription
      : messages.strategies.editStrategyDescription;
  const accountSummary = formatMessage(
    messages.strategies.form.accountSummary,
    {
      username: binding.username,
      displayName: binding.displayName ?? messages.common.noDisplayName,
    },
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl rounded-[2rem] border-border/70 bg-white p-0 dark:border-white/10 dark:bg-[#111713]">
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>

          <form action={action} className="space-y-5">
            <input type="hidden" name="bindingId" value={binding.id} />
            <input type="hidden" name="mode" value={effectiveMode} />
            {dialogState.type === "edit" ? (
              <input
                type="hidden"
                name="profileId"
                value={editingProfile!.id}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {messages.strategies.form.accountLabel}
                </p>
                <div className="rounded-2xl border border-border/70 bg-[#f8faf8] px-4 py-3 text-sm text-foreground dark:border-white/10 dark:bg-white/8">
                  {accountSummary}
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="strategy-mode">
                  {messages.strategies.form.modeLabel}
                </FieldLabel>
                {dialogState.type === "create" ? (
                  <select
                    id="strategy-mode"
                    value={mode}
                    onChange={(event) =>
                      setMode(event.target.value as "HOT" | "SEARCH")
                    }
                    className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
                  >
                    <option value="HOT">{messages.enums.crawlMode.HOT}</option>
                    <option value="SEARCH">
                      {messages.enums.crawlMode.SEARCH}
                    </option>
                  </select>
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-[#f8faf8] px-4 py-3 text-sm text-foreground dark:border-white/10 dark:bg-white/8">
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {messages.enums.crawlMode[editingProfile!.mode]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {messages.strategies.modeReadonlyHint}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm leading-6 text-muted-foreground">
              {dialogState.type === "create"
                ? messages.strategies.form.createHint
                : messages.strategies.form.editHint}
            </p>

            <StrategyScheduleBuilder
              idPrefix={`strategy-${dialogState.type}-${dialogState.type === "edit" ? editingProfile!.id : binding.id}`}
              initialValue={{
                intervalMinutes: editingProfile?.intervalMinutes ?? 60,
                scheduleCron: editingProfile?.scheduleCron ?? null,
                scheduleKind: editingProfile?.scheduleKind ?? "INTERVAL",
              }}
              messages={scheduleMessages}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="strategy-query">
                  {messages.strategies.queryTextLabel}
                </FieldLabel>
                <Input
                  id="strategy-query"
                  name="queryText"
                  defaultValue={editingProfile?.queryText ?? ""}
                  disabled={effectiveMode !== "SEARCH"}
                  placeholder={messages.strategies.queryTextPlaceholder}
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="strategy-max-posts">
                  {messages.strategies.maxPostsLabel}
                </FieldLabel>
                <Input
                  id="strategy-max-posts"
                  name="maxPosts"
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={String(editingProfile?.maxPosts ?? 20)}
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-[#f8faf8] px-4 py-3 dark:border-white/10 dark:bg-white/8">
              <div>
                <p className="font-medium text-foreground">
                  {messages.strategies.strategyEnabledLabel}
                </p>
                <p className="text-sm text-muted-foreground">
                  {messages.strategies.strategyEnabledHint}
                </p>
              </div>
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={editingProfile?.enabled ?? true}
                className="h-4 w-4 rounded border-border text-[#2d4d3f] focus:ring-[#2d4d3f] dark:border-white/20 dark:bg-white/10 dark:text-[#d8e2db] dark:focus:ring-[#d8e2db]"
              />
            </div>

            <ActionFeedback state={activeState} />

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={onClose}
              >
                {messages.common.backToList}
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                disabled={isPending}
              >
                {isPending
                  ? messages.strategies.savingStrategy
                  : messages.strategies.saveStrategy}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StrategyConsole({ bindings, locale }: StrategyConsoleProps) {
  const messages = getMessages(locale);
  const [selectedBindingId, setSelectedBindingId] = useState<string | null>(
    bindings[0]?.id ?? null,
  );
  const [dialogState, setDialogState] = useState<StrategyDialogState>(null);
  const [triggerState, triggerAction, isTriggerPending] = useActionState(
    triggerCrawlProfileAction,
    initialActionState,
  );
  const currentBinding =
    bindings.find((binding) => binding.id === selectedBindingId) ??
    bindings[0] ??
    null;

  useEffect(() => {
    if (!bindings.some((binding) => binding.id === selectedBindingId)) {
      setSelectedBindingId(bindings[0]?.id ?? null);
    }
  }, [bindings, selectedBindingId]);

  useEffect(() => {
    if (currentBinding) {
      return;
    }

    setDialogState(null);
  }, [currentBinding]);

  const currentBindingSummary = useMemo(() => {
    if (!currentBinding) {
      return null;
    }

    const enabledCount = currentBinding.crawlProfiles.filter(
      (profile) => profile.enabled,
    ).length;
    const nextRunAt = getNextStrategyRun(currentBinding);

    return {
      enabledCount,
      nextRunAt,
      totalCount: currentBinding.crawlProfiles.length,
    };
  }, [currentBinding]);

  return (
    <>
      {currentBinding && dialogState ? (
        <StrategyDialogForm
          key={`${currentBinding.id}:${dialogState.type}:${dialogState.type === "edit" ? dialogState.profileId : "create"}`}
          binding={currentBinding}
          dialogState={dialogState}
          locale={locale}
          onClose={() => setDialogState(null)}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.25)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">
                  {messages.strategies.accountListTitle}
                </CardTitle>
                <CardDescription className="mt-2 leading-6">
                  {messages.strategies.accountListDescription}
                </CardDescription>
              </div>
              <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                {formatMessage(messages.strategies.accountCount, {
                  count: bindings.length,
                })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {bindings.length > 0 ? (
              bindings.map((binding) => {
                const isSelected = binding.id === currentBinding?.id;
                const enabledProfiles = binding.crawlProfiles.filter(
                  (profile) => profile.enabled,
                ).length;
                const nextRunAt = getNextStrategyRun(binding);

                return (
                  <button
                    key={binding.id}
                    type="button"
                    onClick={() => setSelectedBindingId(binding.id)}
                    className={cn(
                      "rounded-[1.75rem] border px-5 py-4 text-left transition-colors",
                      isSelected
                        ? "border-[#2d4d3f]/40 bg-[#eef4f0] shadow-[0_16px_50px_-34px_rgba(45,77,63,0.45)] dark:border-[#d8e2db]/25 dark:bg-[#223228]"
                        : "border-border/70 bg-[#fcfaf5] hover:border-[#c7b08a]/50 hover:bg-[#f8f3eb] dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          @{binding.username}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {binding.displayName ?? messages.common.noDisplayName}
                        </p>
                      </div>
                      <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                        {formatMessage(messages.strategies.strategyCount, {
                          count: binding.crawlProfiles.length,
                        })}
                      </Badge>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {messages.strategies.enabledStrategyLabel}
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {formatMessage(
                            messages.strategies.enabledStrategyCount,
                            {
                              count: enabledProfiles,
                            },
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {messages.strategies.nextRunLabel}
                        </dt>
                        <dd className="mt-1 text-foreground">
                          {formatDateTime(
                            nextRunAt,
                            locale,
                            messages.common.notScheduled,
                          )}
                        </dd>
                      </div>
                    </dl>
                  </button>
                );
              })
            ) : (
              <EmptyState
                title={messages.strategies.noAccountTitle}
                description={messages.strategies.noAccountDescription}
                action={
                  <Link
                    href="/bindings"
                    className="inline-flex h-10 items-center justify-center rounded-full bg-[#2d4d3f] px-5 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                  >
                    {messages.strategies.openBindings}
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {messages.strategies.workspaceTitle}
                </CardTitle>
                <CardDescription className="mt-2 max-w-3xl leading-6">
                  {messages.strategies.workspaceDescription}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/bindings"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                >
                  {messages.strategies.viewBindingWorkspace}
                </Link>
                <Button
                  type="button"
                  className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                  disabled={!currentBinding}
                  onClick={() => setDialogState({ type: "create" })}
                >
                  {messages.strategies.createStrategy}
                </Button>
              </div>
            </div>

            {currentBinding && currentBindingSummary ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-[#f5efe4] p-5 dark:bg-[#3d3124]">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7f5a26] dark:text-[#f2c58c]">
                    {messages.strategies.selectedAccount}
                  </p>
                  <p className="mt-2 text-base font-medium text-foreground">
                    @{currentBinding.username}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {currentBinding.displayName ??
                      messages.common.noDisplayName}
                  </p>
                </div>
                <div className="rounded-3xl bg-[#eef4f0] p-5 dark:bg-[#223228]">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#2d4d3f] dark:text-[#d8e2db]">
                    {messages.strategies.strategyCountLabel}
                  </p>
                  <p className="mt-2 text-base font-medium text-foreground">
                    {formatMessage(messages.strategies.strategyCount, {
                      count: currentBindingSummary.totalCount,
                    })}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatMessage(messages.strategies.enabledStrategyCount, {
                      count: currentBindingSummary.enabledCount,
                    })}
                  </p>
                </div>
                <div className="rounded-3xl bg-[#f7f2e8] p-5 dark:bg-[#2a241c]">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7f5a26] dark:text-[#f2c58c]">
                    {messages.strategies.nextRunLabel}
                  </p>
                  <p className="mt-2 text-base font-medium text-foreground">
                    {formatDateTime(
                      currentBindingSummary.nextRunAt,
                      locale,
                      messages.common.notScheduled,
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {messages.strategies.selectedAccountHint}
                  </p>
                </div>
              </div>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-5">
            <ActionFeedback state={triggerState} />

            {!currentBinding ? (
              <EmptyState
                title={messages.strategies.noAccountTitle}
                description={messages.strategies.noAccountDescription}
              />
            ) : currentBinding.crawlProfiles.length > 0 ? (
              <div className="space-y-4">
                {currentBinding.crawlProfiles.map((profile) => (
                  <StrategyCard
                    key={profile.id}
                    binding={currentBinding}
                    locale={locale}
                    profile={profile}
                    triggerAction={triggerAction}
                    isTriggerPending={isTriggerPending}
                    onEdit={() =>
                      setDialogState({ type: "edit", profileId: profile.id })
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title={messages.strategies.emptyStrategiesTitle}
                description={messages.strategies.emptyStrategiesDescription}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StrategyCard({
  binding,
  locale,
  profile,
  triggerAction,
  isTriggerPending,
  onEdit,
}: {
  binding: BindingRecord;
  locale: Locale;
  profile: CrawlProfileRecord;
  triggerAction: (payload: FormData) => void;
  isTriggerPending: boolean;
  onEdit: () => void;
}) {
  const messages = getMessages(locale);
  const scheduleSummary = describeSchedule(
    {
      intervalMinutes: profile.intervalMinutes,
      scheduleKind: profile.scheduleKind,
      scheduleCron: profile.scheduleCron,
    },
    messages.strategies.scheduleBuilder,
  );

  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
              {messages.enums.crawlMode[profile.mode]}
            </Badge>
            <Badge
              className={cn(
                "rounded-full",
                profile.enabled
                  ? "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]"
                  : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
              )}
            >
              {profile.enabled
                ? messages.bindings.crawlEnabled
                : messages.bindings.crawlDisabled}
            </Badge>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {messages.strategies.scheduleLabel}
              </p>
              <p className="mt-1 text-foreground">{scheduleSummary}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {messages.strategies.maxPostsLabel}
              </p>
              <p className="mt-1 text-foreground">{profile.maxPosts}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {messages.strategies.lastRunLabel}
              </p>
              <p className="mt-1 text-foreground">
                {formatDateTime(
                  profile.lastRunAt,
                  locale,
                  messages.common.notRecorded,
                )}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {messages.strategies.nextRunLabel}
              </p>
              <p className="mt-1 text-foreground">
                {formatDateTime(
                  profile.nextRunAt,
                  locale,
                  messages.common.notScheduled,
                )}
              </p>
            </div>
            {profile.mode === "SEARCH" ? (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {messages.strategies.queryTextLabel}
                </p>
                <p className="mt-1 break-words text-foreground">
                  {profile.queryText ?? messages.common.notRecorded}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full px-4"
            onClick={onEdit}
          >
            {messages.strategies.editStrategy}
          </Button>
          <form action={triggerAction}>
            <input type="hidden" name="bindingId" value={binding.id} />
            <input type="hidden" name="profileId" value={profile.id} />
            <Button
              type="submit"
              className="rounded-full bg-[#7f5a26] px-4 hover:bg-[#65471f] dark:bg-[#f2c58c] dark:text-[#2c2114] dark:hover:bg-[#e5b775]"
              disabled={isTriggerPending || binding.status !== "ACTIVE"}
            >
              {isTriggerPending
                ? messages.strategies.triggeringNow
                : messages.strategies.triggerNow}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
