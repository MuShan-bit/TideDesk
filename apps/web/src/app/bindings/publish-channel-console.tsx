"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";
import {
  createPublishChannelAction,
  disablePublishChannelAction,
  revalidatePublishChannelAction,
  type BindingActionState,
  updatePublishChannelAction,
} from "./actions";
import { type PublishChannelBindingRecord } from "./publish-channel-types";
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

const initialActionState: BindingActionState = {};
const newPublishChannelKey = "__new_publish_channel__";

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
  platform: PublishChannelBindingRecord["platformType"];
}) {
  const className = {
    WECHAT: "bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]",
    ZHIHU: "bg-[#eef3fb] text-[#1d4ed8] dark:bg-[#1e293b] dark:text-[#bfdbfe]",
    CSDN: "bg-[#fff1ef] text-[#c2410c] dark:bg-[#3b1d15] dark:text-[#fdba74]",
  }[platform];

  return <Badge className={cn("rounded-full", className)}>{label}</Badge>;
}

function FormFeedback({ state }: { state: BindingActionState }) {
  if (state.error) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
        {state.error}
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
        {state.success}
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

export function PublishChannelConsole({
  channels,
  locale,
}: PublishChannelConsoleProps) {
  const messages = getMessages(locale);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    channels[0]?.id ?? newPublishChannelKey,
  );
  const [createState, createAction, isCreating] = useActionState(
    createPublishChannelAction,
    initialActionState,
  );
  const [updateState, updateAction, isUpdating] = useActionState(
    updatePublishChannelAction,
    initialActionState,
  );
  const [revalidateState, revalidateAction, isRevalidating] = useActionState(
    revalidatePublishChannelAction,
    initialActionState,
  );
  const [disableState, disableAction, isDisabling] = useActionState(
    disablePublishChannelAction,
    initialActionState,
  );

  const currentChannel =
    selectedChannelId && selectedChannelId !== newPublishChannelKey
      ? channels.find((channel) => channel.id === selectedChannelId) ?? null
      : null;
  const platformOptions = [
    { value: "WECHAT", label: messages.enums.publishPlatformType.WECHAT },
    { value: "ZHIHU", label: messages.enums.publishPlatformType.ZHIHU },
    { value: "CSDN", label: messages.enums.publishPlatformType.CSDN },
  ] as const;

  useEffect(() => {
    if (
      selectedChannelId &&
      selectedChannelId !== newPublishChannelKey &&
      !channels.some((channel) => channel.id === selectedChannelId)
    ) {
      setSelectedChannelId(channels[0]?.id ?? newPublishChannelKey);
    }
  }, [channels, selectedChannelId]);

  return (
    <div className="space-y-8">
      <PageSectionHeader
        badge={formatMessage(messages.bindings.publishChannels.count, {
          count: channels.length,
        })}
        description={messages.bindings.publishChannels.description}
        title={messages.bindings.publishChannels.title}
      />

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.25)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">
                    {messages.bindings.publishChannels.listTitle}
                  </CardTitle>
                  <CardDescription className="mt-2 leading-6">
                    {messages.bindings.publishChannels.listDescription}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-5"
                  onClick={() => setSelectedChannelId(newPublishChannelKey)}
                >
                  {messages.bindings.publishChannels.newAction}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {channels.length > 0 ? (
                channels.map((channel) => {
                  const isSelected = channel.id === currentChannel?.id;

                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setSelectedChannelId(channel.id)}
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
                            {channel.displayName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {channel.accountIdentifier ??
                              messages.bindings.publishChannels.accountIdentifierEmpty}
                          </p>
                        </div>
                        <PublishChannelStatusBadge
                          label={
                            messages.enums.publishBindingStatus[channel.status]
                          }
                          status={channel.status}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <PublishPlatformBadge
                          label={
                            messages.enums.publishPlatformType[
                              channel.platformType
                            ]
                          }
                          platform={channel.platformType}
                        />
                        <span className="text-sm text-muted-foreground">
                          {messages.bindings.publishChannels.lastValidatedAtLabel}：
                          {formatDateTime(
                            channel.lastValidatedAt,
                            locale,
                            messages.common.notRecorded,
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <EmptyState
                  title={messages.bindings.publishChannels.emptyTitle}
                  description={messages.bindings.publishChannels.emptyDescription}
                />
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-2xl">
                  {messages.bindings.publishChannels.summaryTitle}
                </CardTitle>
                {currentChannel ? (
                  <PublishChannelStatusBadge
                    label={
                      messages.enums.publishBindingStatus[currentChannel.status]
                    }
                    status={currentChannel.status}
                  />
                ) : null}
              </div>
              <CardDescription className="leading-6">
                {messages.bindings.publishChannels.summaryDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {currentChannel ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-[#f5efe4] p-5 dark:bg-[#3d3124]">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#7f5a26] dark:text-[#f2c58c]">
                        {messages.bindings.publishChannels.displayNameLabel}
                      </p>
                      <p className="mt-2 text-base font-medium text-foreground">
                        {currentChannel.displayName}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-[#eef4f0] p-5 dark:bg-[#223228]">
                      <p className="text-xs uppercase tracking-[0.24em] text-[#2d4d3f] dark:text-[#d8e2db]">
                        {messages.bindings.publishChannels.platformLabel}
                      </p>
                      <p className="mt-2 text-base font-medium text-foreground">
                        {
                          messages.enums.publishPlatformType[
                            currentChannel.platformType
                          ]
                        }
                      </p>
                    </div>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {messages.bindings.publishChannels.accountIdentifierLabel}
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {currentChannel.accountIdentifier ??
                          messages.bindings.publishChannels.accountIdentifierEmpty}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {messages.bindings.publishChannels.lastValidatedAtLabel}
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {formatDateTime(
                          currentChannel.lastValidatedAt,
                          locale,
                          messages.common.notRecorded,
                        )}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {messages.bindings.publishChannels.createdAtLabel}
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {formatDateTime(
                          currentChannel.createdAt,
                          locale,
                          messages.common.notRecorded,
                        )}
                      </dd>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                      <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {messages.bindings.publishChannels.updatedAtLabel}
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {formatDateTime(
                          currentChannel.updatedAt,
                          locale,
                          messages.common.notRecorded,
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div className="rounded-3xl border border-border/70 bg-[#fcfaf5] px-5 py-4 text-sm dark:border-white/10 dark:bg-white/8">
                    <p className="font-medium text-foreground">
                      {messages.bindings.publishChannels.lastValidationErrorLabel}
                    </p>
                    <p className="mt-2 leading-6 text-muted-foreground">
                      {currentChannel.lastValidationError ??
                        messages.bindings.publishChannels.noValidationError}
                    </p>
                  </div>
                </>
              ) : (
                <EmptyState
                  title={messages.bindings.publishChannels.noSelectionTitle}
                  description={
                    messages.bindings.publishChannels.noSelectionDescription
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.3)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
            <CardHeader>
              <CardTitle className="text-2xl">
                {currentChannel
                  ? messages.bindings.publishChannels.editTitle
                  : messages.bindings.publishChannels.createTitle}
              </CardTitle>
              <CardDescription className="leading-6">
                {currentChannel
                  ? messages.bindings.publishChannels.editDescription
                  : messages.bindings.publishChannels.createDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={currentChannel ? updateAction : createAction}
                className="space-y-5"
              >
                {currentChannel ? (
                  <input
                    type="hidden"
                    name="publishChannelId"
                    value={currentChannel.id}
                  />
                ) : null}

                {currentChannel ? (
                  <div className="space-y-2">
                    <FieldLabel htmlFor="publish-platform-readonly">
                      {messages.bindings.publishChannels.platformLabel}
                    </FieldLabel>
                    <div
                      id="publish-platform-readonly"
                      className="flex h-11 items-center rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 text-sm text-foreground dark:border-white/10 dark:bg-white/8"
                    >
                      {
                        messages.enums.publishPlatformType[
                          currentChannel.platformType
                        ]
                      }
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FieldLabel htmlFor="publish-platformType">
                      {messages.bindings.publishChannels.platformLabel}
                    </FieldLabel>
                    <select
                      id="publish-platformType"
                      name="platformType"
                      defaultValue="WECHAT"
                      className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
                    >
                      {platformOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <FieldLabel htmlFor="publish-displayName">
                    {messages.bindings.publishChannels.displayNameLabel}
                  </FieldLabel>
                  <Input
                    id="publish-displayName"
                    name="displayName"
                    defaultValue={currentChannel?.displayName ?? ""}
                    placeholder={
                      messages.bindings.publishChannels.placeholders.displayName
                    }
                    className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="publish-accountIdentifier">
                    {messages.bindings.publishChannels.accountIdentifierLabel}
                  </FieldLabel>
                  <Input
                    id="publish-accountIdentifier"
                    name="accountIdentifier"
                    defaultValue={currentChannel?.accountIdentifier ?? ""}
                    placeholder={
                      messages.bindings.publishChannels.placeholders
                        .accountIdentifier
                    }
                    className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel htmlFor="publish-credentialPayload">
                    {messages.bindings.publishChannels.credentialPayloadLabel}
                  </FieldLabel>
                  <textarea
                    id="publish-credentialPayload"
                    name="credentialPayload"
                    defaultValue=""
                    placeholder={
                      messages.bindings.publishChannels.placeholders
                        .credentialPayload
                    }
                    className="min-h-48 w-full rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    {currentChannel
                      ? messages.bindings.publishChannels.credentialPayloadOptionalHint
                      : messages.bindings.publishChannels.credentialPayloadHint}
                  </p>
                </div>

                <FormFeedback state={currentChannel ? updateState : createState} />

                <div className="flex flex-wrap justify-end gap-3">
                  <Button
                    type="submit"
                    className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                    disabled={currentChannel ? isUpdating : isCreating}
                  >
                    {currentChannel
                      ? isUpdating
                        ? messages.bindings.publishChannels.savingUpdate
                        : messages.bindings.publishChannels.saveUpdate
                      : isCreating
                        ? messages.bindings.publishChannels.savingCreate
                        : messages.bindings.publishChannels.saveCreate}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {currentChannel ? (
            <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.2)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <CardTitle className="text-xl">
                  {messages.bindings.publishChannels.operationsTitle}
                </CardTitle>
                <CardDescription>
                  {messages.bindings.publishChannels.operationsDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={revalidateAction} className="space-y-3">
                  <input
                    type="hidden"
                    name="publishChannelId"
                    value={currentChannel.id}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="rounded-full px-5"
                    disabled={isRevalidating}
                  >
                    {isRevalidating
                      ? messages.bindings.publishChannels.revalidatingAction
                      : messages.bindings.publishChannels.revalidateAction}
                  </Button>
                  <FormFeedback state={revalidateState} />
                </form>

                <form action={disableAction} className="space-y-3">
                  <input
                    type="hidden"
                    name="publishChannelId"
                    value={currentChannel.id}
                  />
                  <Button
                    type="submit"
                    variant="destructive"
                    className="rounded-full px-5"
                    disabled={
                      isDisabling || currentChannel.status === "DISABLED"
                    }
                  >
                    {isDisabling
                      ? messages.bindings.publishChannels.disablingAction
                      : messages.bindings.publishChannels.disableAction}
                  </Button>
                  <FormFeedback state={disableState} />
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
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
    <section className="grid gap-4 rounded-[2rem] border border-border/70 bg-white/78 p-6 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)] backdrop-blur dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)] lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7f5a26] dark:text-[#f2c58c]">
          {title}
        </p>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>
      <Badge className="rounded-full bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]">
        {badge}
      </Badge>
    </section>
  );
}
