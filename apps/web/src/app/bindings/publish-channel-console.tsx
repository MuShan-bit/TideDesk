"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createPublishChannelAction,
  disablePublishChannelAction,
  revalidatePublishChannelAction,
  type BindingActionState,
  updatePublishChannelAction,
} from "./actions";
import {
  type PublishChannelBindingRecord,
  type PublishPlatformTypeValue,
} from "./publish-channel-types";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatMessage,
  getIntlLocale,
  getMessages,
  type Locale,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PublishChannelConsoleProps = {
  channels: PublishChannelBindingRecord[];
  locale: Locale;
};

type PublishChannelDialogState =
  | {
      platformType: PublishPlatformTypeValue;
      type: "create";
    }
  | {
      channelId: string;
      type: "edit";
    }
  | null;

const initialActionState: BindingActionState = {};
const platformOrder: PublishPlatformTypeValue[] = ["WECHAT", "ZHIHU", "CSDN"];

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

function PublishChannelStatusBadge({
  label,
  status,
}: {
  label: string;
  status: PublishChannelBindingRecord["status"];
}) {
  const className = {
    ACTIVE: "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]",
    INVALID: "bg-[#b95c00] text-white dark:bg-[#5a2e00] dark:text-[#ffd1a1]",
    DISABLED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
    PENDING: "bg-[#7f5a26] text-white dark:bg-[#4b3a1e] dark:text-[#f2c58c]",
  }[status];

  return <Badge className={cn("rounded-full", className)}>{label}</Badge>;
}

function PublishPlatformBadge({
  label,
  platform,
}: {
  label: string;
  platform: PublishPlatformTypeValue;
}) {
  const className = {
    WECHAT: "bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]",
    ZHIHU: "bg-[#eef3fb] text-[#1d4ed8] dark:bg-[#1e293b] dark:text-[#bfdbfe]",
    CSDN: "bg-[#fff1ef] text-[#c2410c] dark:bg-[#3b1d15] dark:text-[#fdba74]",
  }[platform];

  return <Badge className={cn("rounded-full", className)}>{label}</Badge>;
}

function ActionFeedback({ state }: { state: BindingActionState }) {
  if (!state.error && !state.success) {
    return null;
  }

  if (state.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-400/25 dark:bg-red-950/30 dark:text-red-200">
        {state.error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-950/30 dark:text-emerald-100">
      {state.success}
    </div>
  );
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

function PageSectionHeader({
  badge,
  description,
  title,
}: {
  badge: string;
  description: string;
  title: string;
}) {
  return (
    <section className="grid gap-4 rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.18)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_60px_-40px_rgba(0,0,0,0.55)] lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#145375] dark:text-sky-200">
          {title}
        </p>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <Badge className="rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] text-white">
        {badge}
      </Badge>
    </section>
  );
}

function PublishChannelDialog({
  channel,
  locale,
  onClose,
  platformType,
}: {
  channel: PublishChannelBindingRecord | null;
  locale: Locale;
  onClose: () => void;
  platformType: PublishPlatformTypeValue;
}) {
  const messages = getMessages(locale);
  const [createState, createAction, isCreating] = useActionState(
    createPublishChannelAction,
    initialActionState,
  );
  const [updateState, updateAction, isUpdating] = useActionState(
    updatePublishChannelAction,
    initialActionState,
  );
  const activeState = channel ? updateState : createState;

  useEffect(() => {
    if (!activeState.success) {
      return;
    }

    onClose();
  }, [activeState.success, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-none rounded-[2rem] border-border/70 bg-white p-0 dark:border-white/10 dark:bg-[#111827]"
        style={{ maxWidth: "60rem", width: "min(96vw, 60rem)" }}
      >
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {channel
                ? messages.bindings.publishChannels.editTitle
                : messages.bindings.publishChannels.createTitle}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {channel
                ? messages.bindings.publishChannels.editDescription
                : messages.bindings.publishChannels.createDescription}
            </DialogDescription>
          </DialogHeader>

          <form
            action={channel ? updateAction : createAction}
            className="space-y-5"
          >
            {channel ? (
              <input type="hidden" name="publishChannelId" value={channel.id} />
            ) : (
              <input type="hidden" name="platformType" value={platformType} />
            )}

            <div className="space-y-2">
              <FieldLabel htmlFor="publish-platform-readonly">
                {messages.bindings.publishChannels.platformLabel}
              </FieldLabel>
              <div
                id="publish-platform-readonly"
                className="flex h-11 items-center rounded-2xl border border-border/70 bg-[#f5f9fd] px-4 text-sm text-foreground dark:border-white/10 dark:bg-white/8"
              >
                {messages.enums.publishPlatformType[platformType]}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="publish-display-name">
                  {messages.bindings.publishChannels.displayNameLabel}
                </FieldLabel>
                <Input
                  id="publish-display-name"
                  name="displayName"
                  defaultValue={channel?.displayName ?? ""}
                  placeholder={
                    messages.bindings.publishChannels.placeholders.displayName
                  }
                  className="h-11 rounded-2xl border-border/70 bg-[#f5f9fd] px-4 dark:border-white/10 dark:bg-white/8"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="publish-account-identifier">
                  {messages.bindings.publishChannels.accountIdentifierLabel}
                </FieldLabel>
                <Input
                  id="publish-account-identifier"
                  name="accountIdentifier"
                  defaultValue={channel?.accountIdentifier ?? ""}
                  placeholder={
                    messages.bindings.publishChannels.placeholders
                      .accountIdentifier
                  }
                  className="h-11 rounded-2xl border-border/70 bg-[#f5f9fd] px-4 dark:border-white/10 dark:bg-white/8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="publish-credential-payload">
                {messages.bindings.publishChannels.credentialPayloadLabel}
              </FieldLabel>
              <textarea
                id="publish-credential-payload"
                name="credentialPayload"
                rows={10}
                defaultValue=""
                placeholder={
                  messages.bindings.publishChannels.placeholders
                    .credentialPayload
                }
                className="w-full rounded-[1.5rem] border border-border/70 bg-[#f5f9fd] px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/8"
              />
              <p className="text-sm leading-6 text-muted-foreground">
                {channel
                  ? messages.bindings.publishChannels
                      .credentialPayloadOptionalHint
                  : messages.bindings.publishChannels.credentialPayloadHint}
              </p>
            </div>

            <ActionFeedback state={activeState} />

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={onClose}
              >
                {messages.common.cancel}
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] px-5 text-white hover:brightness-105"
                disabled={channel ? isUpdating : isCreating}
              >
                {channel
                  ? isUpdating
                    ? messages.bindings.publishChannels.savingUpdate
                    : messages.bindings.publishChannels.saveUpdate
                  : isCreating
                    ? messages.bindings.publishChannels.savingCreate
                    : messages.bindings.publishChannels.saveCreate}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PublishChannelConsole({
  channels,
  locale,
}: PublishChannelConsoleProps) {
  const messages = getMessages(locale);
  const [dialogState, setDialogState] =
    useState<PublishChannelDialogState>(null);
  const [revalidateState, revalidateAction, isRevalidating] = useActionState(
    revalidatePublishChannelAction,
    initialActionState,
  );
  const [disableState, disableAction, isDisabling] = useActionState(
    disablePublishChannelAction,
    initialActionState,
  );

  const groupedChannels = useMemo(
    () =>
      channels.reduce<Record<PublishPlatformTypeValue, PublishChannelBindingRecord[]>>(
        (accumulator, channel) => {
          accumulator[channel.platformType].push(channel);

          return accumulator;
        },
        {
          WECHAT: [],
          ZHIHU: [],
          CSDN: [],
        },
      ),
    [channels],
  );

  const editingChannel =
    dialogState?.type === "edit"
      ? channels.find((channel) => channel.id === dialogState.channelId) ?? null
      : null;
  const dialogPlatformType =
    dialogState?.type === "create"
      ? dialogState.platformType
      : editingChannel?.platformType ?? null;

  useEffect(() => {
    if (dialogState?.type !== "edit") {
      return;
    }

    if (editingChannel) {
      return;
    }

    setDialogState(null);
  }, [dialogState, editingChannel]);

  const feedbackStates = [revalidateState, disableState].filter(
    (state) => state.error || state.success,
  );

  return (
    <div className="space-y-6">
      <PageSectionHeader
        badge={formatMessage(messages.bindings.publishChannels.count, {
          count: channels.length,
        })}
        description={messages.bindings.publishChannels.description}
        title={messages.bindings.publishChannels.title}
      />

      {feedbackStates.length > 0 ? (
        <div className="space-y-3">
          {feedbackStates.map((state, index) => (
            <ActionFeedback
              key={`${state.success ?? state.error ?? "publish-feedback"}-${index}`}
              state={state}
            />
          ))}
        </div>
      ) : null}

      <div className="grid gap-6">
        {platformOrder.map((platformType) => {
          const items = groupedChannels[platformType];
          const platformLabel = messages.enums.publishPlatformType[platformType];

          return (
            <Card
              key={platformType}
              className="border-border/70 bg-white/92 dark:border-white/10 dark:bg-white/6"
            >
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <CardTitle className="text-2xl">{platformLabel}</CardTitle>
                      <PublishPlatformBadge
                        label={platformLabel}
                        platform={platformType}
                      />
                    </div>
                    <CardDescription className="mt-2 max-w-3xl leading-6">
                      {messages.bindings.publishChannels.listDescription}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className="rounded-full bg-[#edf6fb] text-[#145375] dark:bg-white/8 dark:text-sky-200">
                      {formatMessage(messages.bindings.publishChannels.count, {
                        count: items.length,
                      })}
                    </Badge>
                    <Button
                      type="button"
                      className="rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] px-5 text-white hover:brightness-105"
                      onClick={() =>
                        setDialogState({
                          type: "create",
                          platformType,
                        })
                      }
                    >
                      {messages.bindings.publishChannels.newAction}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-0">
                <Table className="min-w-[1080px]">
                  <TableHeader>
                    <TableRow className="border-y border-border/70 bg-[#f5f9fd] hover:bg-[#f5f9fd] dark:border-white/10 dark:bg-white/8">
                      <TableHead className="px-5">
                        {messages.bindings.publishChannels.displayNameLabel}
                      </TableHead>
                      <TableHead>
                        {messages.bindings.publishChannels.accountIdentifierLabel}
                      </TableHead>
                      <TableHead>{messages.common.statusLabel}</TableHead>
                      <TableHead>
                        {messages.bindings.publishChannels.lastValidatedAtLabel}
                      </TableHead>
                      <TableHead>{messages.common.updatedAtLabel}</TableHead>
                      <TableHead className="whitespace-normal">
                        {messages.common.resultLabel}
                      </TableHead>
                      <TableHead className="px-5 text-right">
                        {messages.common.actionsLabel}
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {items.length > 0 ? (
                      items.map((channel) => (
                        <TableRow
                          key={channel.id}
                          className="border-border/70 dark:border-white/10"
                        >
                          <TableCell className="px-5 align-top whitespace-normal">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {channel.displayName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {platformLabel}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="align-top whitespace-normal">
                            {channel.accountIdentifier ??
                              messages.bindings.publishChannels
                                .accountIdentifierEmpty}
                          </TableCell>
                          <TableCell className="align-top">
                            <PublishChannelStatusBadge
                              label={
                                messages.enums.publishBindingStatus[
                                  channel.status
                                ]
                              }
                              status={channel.status}
                            />
                          </TableCell>
                          <TableCell className="align-top whitespace-normal">
                            {formatDateTime(
                              channel.lastValidatedAt,
                              locale,
                              messages.common.notRecorded,
                            )}
                          </TableCell>
                          <TableCell className="align-top whitespace-normal">
                            {formatDateTime(
                              channel.updatedAt,
                              locale,
                              messages.common.notRecorded,
                            )}
                          </TableCell>
                          <TableCell className="max-w-[280px] align-top whitespace-normal">
                            <span className="text-sm text-muted-foreground">
                              {channel.lastValidationError ??
                                messages.bindings.publishChannels.noValidationError}
                            </span>
                          </TableCell>
                          <TableCell className="px-5 align-top">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-full px-3"
                                onClick={() =>
                                  setDialogState({
                                    type: "edit",
                                    channelId: channel.id,
                                  })
                                }
                              >
                                {messages.common.edit}
                              </Button>

                              <form action={revalidateAction}>
                                <input
                                  type="hidden"
                                  name="publishChannelId"
                                  value={channel.id}
                                />
                                <Button
                                  type="submit"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full px-3"
                                  disabled={isRevalidating}
                                >
                                  {messages.bindings.publishChannels.revalidateAction}
                                </Button>
                              </form>

                              <form action={disableAction}>
                                <input
                                  type="hidden"
                                  name="publishChannelId"
                                  value={channel.id}
                                />
                                <Button
                                  type="submit"
                                  variant="destructive"
                                  size="sm"
                                  className="rounded-full px-3"
                                  disabled={
                                    isDisabling || channel.status === "DISABLED"
                                  }
                                >
                                  {messages.bindings.publishChannels.disableAction}
                                </Button>
                              </form>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="border-border/70 dark:border-white/10">
                        <TableCell
                          colSpan={7}
                          className="px-5 py-10 text-center text-sm text-muted-foreground"
                        >
                          {messages.bindings.publishChannels.emptyDescription}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {dialogState && dialogPlatformType ? (
        <PublishChannelDialog
          channel={editingChannel}
          locale={locale}
          onClose={() => setDialogState(null)}
          platformType={dialogPlatformType}
        />
      ) : null}
    </div>
  );
}
