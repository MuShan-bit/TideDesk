"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  disableBindingAction,
  revalidateBindingAction,
  type BindingActionState,
  triggerManualCrawlAction,
  upsertBindingAction,
  unbindBindingAction,
} from "./actions";
import { type BindingRecord } from "./binding-types";
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

type BindingConsoleProps = {
  browserDesktopUrl: string | null;
  bindings: BindingRecord[];
  locale: Locale;
};

type BindingBrowserSessionRecord = {
  id: string;
  bindingId: string | null;
  status:
    | "PENDING"
    | "WAITING_LOGIN"
    | "SUCCESS"
    | "FAILED"
    | "EXPIRED"
    | "CANCELLED";
  loginUrl: string;
  expiresAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  xUserId: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  binding: BindingRecord | null;
};

type ManualBindingDialogState =
  | {
      type: "create";
    }
  | {
      bindingId: string;
      type: "edit";
    }
  | null;

const initialActionState: BindingActionState = {};
const browserBindingSessionStorageKey =
  "tidedesk.binding-browser-session-id";

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

function isBrowserSessionActive(status: BindingBrowserSessionRecord["status"]) {
  return status === "PENDING" || status === "WAITING_LOGIN";
}

function getBrowserSessionBadgeClassName(
  status: BindingBrowserSessionRecord["status"],
) {
  return {
    PENDING: "bg-[#7f5a26] text-white dark:bg-[#4b3a1e] dark:text-[#f2c58c]",
    WAITING_LOGIN:
      "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]",
    SUCCESS:
      "bg-emerald-600 text-white dark:bg-emerald-950/40 dark:text-emerald-100",
    FAILED: "bg-red-600 text-white dark:bg-red-950/40 dark:text-red-200",
    EXPIRED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
    CANCELLED:
      "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
  }[status];
}

function getBindingStatusBadgeClassName(
  status: BindingRecord["status"] | "UNBOUND",
) {
  return {
    ACTIVE: "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]",
    INVALID: "bg-[#b95c00] text-white dark:bg-[#5a2e00] dark:text-[#ffd1a1]",
    DISABLED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
    PENDING: "bg-[#7f5a26] text-white dark:bg-[#4b3a1e] dark:text-[#f2c58c]",
    UNBOUND:
      "bg-[#f4ebdb] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]",
  }[status];
}

function getNextStrategyRunAt(binding: BindingRecord) {
  return [...binding.crawlProfiles]
    .filter((profile) => profile.enabled && profile.nextRunAt)
    .sort((left, right) => {
      const leftTime = new Date(left.nextRunAt ?? 0).getTime();
      const rightTime = new Date(right.nextRunAt ?? 0).getTime();

      return leftTime - rightTime;
    })[0]?.nextRunAt;
}

async function requestBrowserSession<T>(
  path: string,
  fallbackMessage: string,
  init?: RequestInit,
) {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
  });
  const payload = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    throw new Error(
      typeof (payload as { error?: string }).error === "string"
        ? (payload as { error?: string }).error
        : fallbackMessage,
    );
  }

  return payload as T;
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: BindingRecord["status"] | "UNBOUND";
}) {
  return (
    <Badge
      className={cn("rounded-full", getBindingStatusBadgeClassName(status))}
    >
      {label}
    </Badge>
  );
}

function ActionFeedback({ state }: { state: BindingActionState }) {
  if (!state.error && !state.success) {
    return null;
  }

  const actionLink =
    state.actionHref && state.actionLabel ? (
      <Link
        href={state.actionHref}
        className="mt-3 inline-flex h-8 items-center justify-center rounded-full border border-white/60 bg-white px-3 text-xs font-medium transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/14"
      >
        {state.actionLabel}
      </Link>
    ) : null;

  if (state.error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-400/25 dark:bg-red-950/30 dark:text-red-200">
        <p>{state.error}</p>
        {actionLink}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-950/30 dark:text-emerald-100">
      <p>{state.success}</p>
      {actionLink}
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

function BindingManualDialog({
  binding,
  locale,
  onClose,
}: {
  binding: BindingRecord | null;
  locale: Locale;
  onClose: () => void;
}) {
  const messages = getMessages(locale);
  const [upsertState, upsertAction, isUpserting] = useActionState(
    upsertBindingAction,
    initialActionState,
  );
  const credentialSourceOptions = [
    { value: "WEB_LOGIN", label: messages.enums.credentialSource.WEB_LOGIN },
    {
      value: "COOKIE_IMPORT",
      label: messages.enums.credentialSource.COOKIE_IMPORT,
    },
    { value: "EXTENSION", label: messages.enums.credentialSource.EXTENSION },
  ] as const;

  useEffect(() => {
    if (!upsertState.success) {
      return;
    }

    onClose();
  }, [onClose, upsertState.success]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-none rounded-[2rem] border-border/70 bg-white p-0 dark:border-white/10 dark:bg-[#111827]"
        style={{ maxWidth: "68rem", width: "min(96vw, 68rem)" }}
      >
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {binding
                ? messages.bindings.manualDialogEditTitle
                : messages.bindings.manualDialogCreateTitle}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {binding
                ? messages.bindings.manualDialogEditDescription
                : messages.bindings.manualDialogCreateDescription}
            </DialogDescription>
          </DialogHeader>

          <form
            key={`binding-manual-${binding?.id ?? "new"}`}
            action={upsertAction}
            className="space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="binding-x-user-id">
                  {messages.bindings.xUserId}
                </FieldLabel>
                <Input
                  id="binding-x-user-id"
                  name="xUserId"
                  defaultValue={binding?.xUserId ?? ""}
                  placeholder={messages.bindings.placeholders.xUserId}
                  className="h-11 rounded-2xl border-border/70 bg-[#f5f9fd] px-4 dark:border-white/10 dark:bg-white/8"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="binding-username">
                  {messages.bindings.username}
                </FieldLabel>
                <Input
                  id="binding-username"
                  name="username"
                  defaultValue={binding?.username ?? ""}
                  placeholder={messages.bindings.placeholders.username}
                  className="h-11 rounded-2xl border-border/70 bg-[#f5f9fd] px-4 dark:border-white/10 dark:bg-white/8"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="binding-display-name">
                  {messages.bindings.displayName}
                </FieldLabel>
                <Input
                  id="binding-display-name"
                  name="displayName"
                  defaultValue={binding?.displayName ?? ""}
                  placeholder={messages.bindings.placeholders.displayName}
                  className="h-11 rounded-2xl border-border/70 bg-[#f5f9fd] px-4 dark:border-white/10 dark:bg-white/8"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="binding-avatar-url">
                  {messages.bindings.avatarUrl}
                </FieldLabel>
                <Input
                  id="binding-avatar-url"
                  name="avatarUrl"
                  defaultValue={binding?.avatarUrl ?? ""}
                  placeholder="https://..."
                  className="h-11 rounded-2xl border-border/70 bg-[#f5f9fd] px-4 dark:border-white/10 dark:bg-white/8"
                />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-2">
                <FieldLabel htmlFor="binding-credential-source">
                  {messages.bindings.credentialSourceLabel}
                </FieldLabel>
                <select
                  id="binding-credential-source"
                  name="credentialSource"
                  defaultValue={binding?.credentialSource ?? "WEB_LOGIN"}
                  className="h-11 w-full rounded-2xl border border-border/70 bg-[#f5f9fd] px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/8"
                >
                  {credentialSourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="binding-crawl-interval">
                  {messages.bindings.crawlIntervalLabel}
                </FieldLabel>
                <Input
                  id="binding-crawl-interval"
                  name="crawlIntervalMinutes"
                  type="number"
                  min={5}
                  max={1440}
                  defaultValue={String(binding?.crawlIntervalMinutes ?? 60)}
                  className="h-11 rounded-2xl border-border/70 bg-[#f5f9fd] px-4 dark:border-white/10 dark:bg-white/8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="binding-credential-payload">
                {messages.bindings.credentialPayload}
              </FieldLabel>
              <textarea
                id="binding-credential-payload"
                name="credentialPayload"
                rows={10}
                placeholder={messages.bindings.placeholders.credentialPayload}
                className="w-full rounded-[1.5rem] border border-border/70 bg-[#f5f9fd] px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/8"
              />
              <p className="text-sm leading-6 text-muted-foreground">
                {messages.bindings.credentialPayloadHint}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-[1.5rem] border border-border/70 bg-[#f5f9fd] px-4 py-3 dark:border-white/10 dark:bg-white/8">
              <div>
                <p className="font-medium text-foreground">
                  {messages.bindings.enableAutoCrawlAfterSave}
                </p>
                <p className="text-sm text-muted-foreground">
                  {messages.bindings.enableAutoCrawlAfterSaveHint}
                </p>
              </div>
              <input
                type="checkbox"
                name="crawlEnabled"
                defaultChecked={binding?.crawlEnabled ?? true}
                className="h-4 w-4 rounded border-border text-[#2d4d3f] focus:ring-[#2d4d3f] dark:border-white/20 dark:bg-white/10 dark:text-[#d8e2db] dark:focus:ring-[#d8e2db]"
              />
            </div>

            <ActionFeedback state={upsertState} />

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
                disabled={isUpserting}
              >
                {isUpserting
                  ? messages.bindings.submitting
                  : binding
                    ? messages.bindings.update
                    : messages.bindings.submit}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BindingBrowserDialog({
  browserDesktopUrl,
  browserSession,
  browserSessionError,
  hasBindings,
  isBrowserSessionPending,
  locale,
  onCancel,
  onClose,
  onRefresh,
  onStart,
}: {
  browserDesktopUrl: string | null;
  browserSession: BindingBrowserSessionRecord | null;
  browserSessionError: string | null;
  hasBindings: boolean;
  isBrowserSessionPending: boolean;
  locale: Locale;
  onCancel: () => void;
  onClose: () => void;
  onRefresh: () => void;
  onStart: () => void;
}) {
  const messages = getMessages(locale);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-none rounded-[2rem] border-border/70 bg-white p-0 dark:border-white/10 dark:bg-[#111827]"
        style={{ maxWidth: "56rem", width: "min(96vw, 56rem)" }}
      >
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {messages.bindings.browserAssistTitle}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {hasBindings
                ? messages.bindings.browserAssistDescriptionBound
                : messages.bindings.browserAssistDescription}
            </DialogDescription>
          </DialogHeader>

          {browserDesktopUrl ? (
            <div className="rounded-2xl border border-[#c7ddee] bg-[#edf6fb] px-4 py-3 text-sm text-[#145375] dark:border-white/10 dark:bg-white/8 dark:text-sky-200">
              {messages.bindings.browserRemoteDesktopNotice}
            </div>
          ) : null}

          <div className="rounded-[1.75rem] border border-border/70 bg-[linear-gradient(135deg,#edf6fb,rgba(245,249,253,0.88))] p-5 dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#145375] dark:text-sky-200">
                  {messages.bindings.browserFlowTitle}
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {browserSession
                    ? messages.enums.browserSessionStatus[browserSession.status]
                    : messages.bindings.startBrowserBinding}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {messages.bindings.browserFlowDescription}
                </p>
              </div>
              {browserSession ? (
                <Badge
                  className={cn(
                    "rounded-full",
                    getBrowserSessionBadgeClassName(browserSession.status),
                  )}
                >
                  {messages.enums.browserSessionStatus[browserSession.status]}
                </Badge>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <p>{messages.bindings.browserStep1}</p>
              <p>{messages.bindings.browserStep2}</p>
              <p>{messages.bindings.browserStep3}</p>
            </div>
          </div>

          {browserSession ? (
            <div className="rounded-[1.75rem] border border-border/70 bg-[#f5f9fd] p-5 dark:border-white/10 dark:bg-white/8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {messages.bindings.sessionId}
                  </p>
                  <p className="mt-2 font-mono text-sm text-foreground">
                    {browserSession.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {messages.bindings.sessionExpiresAt}
                  </p>
                  <p className="mt-2 text-sm text-foreground">
                    {formatDateTime(
                      browserSession.expiresAt,
                      locale,
                      messages.common.notRecorded,
                    )}
                  </p>
                </div>
              </div>

              {browserSession.username ? (
                <div className="mt-4 rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm text-foreground dark:border-white/10 dark:bg-white/10">
                  <p className="font-medium">
                    @{browserSession.username}
                    {browserSession.displayName
                      ? ` · ${browserSession.displayName}`
                      : ""}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {browserSession.xUserId ?? messages.bindings.fillingUserId}
                  </p>
                </div>
              ) : null}

              {browserSession.status === "SUCCESS" ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-950/30 dark:text-emerald-100">
                  {messages.bindings.browserSuccess}
                </div>
              ) : null}

              {browserSession.errorMessage ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-100">
                  {browserSession.errorMessage}
                </div>
              ) : null}
            </div>
          ) : null}

          {browserSessionError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-400/25 dark:bg-red-950/30 dark:text-red-200">
              {browserSessionError}
            </div>
          ) : null}

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
              type="button"
              className="rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] px-5 text-white hover:brightness-105"
              disabled={isBrowserSessionPending && !browserSession}
              onClick={onStart}
            >
              {isBrowserSessionPending && !browserSession
                ? messages.bindings.startingBrowserBinding
                : browserSession && isBrowserSessionActive(browserSession.status)
                  ? messages.bindings.startBrowserBindingAgain
                  : messages.bindings.startBrowserBinding}
            </Button>
            {browserSession &&
            isBrowserSessionActive(browserSession.status) &&
            browserDesktopUrl ? (
              <a
                href={browserDesktopUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
              >
                {messages.bindings.openBrowserDesktop}
              </a>
            ) : null}
            {browserSession && isBrowserSessionActive(browserSession.status) ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                disabled={isBrowserSessionPending}
                onClick={onCancel}
              >
                {messages.bindings.cancelBrowserBinding}
              </Button>
            ) : null}
            {browserSession?.status === "SUCCESS" ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={onRefresh}
              >
                {messages.bindings.refreshBindingState}
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BindingConsole({
  browserDesktopUrl,
  bindings,
  locale,
}: BindingConsoleProps) {
  const messages = getMessages(locale);
  const router = useRouter();
  const credentialSourceLabels = {
    WEB_LOGIN: messages.enums.credentialSource.WEB_LOGIN,
    COOKIE_IMPORT: messages.enums.credentialSource.COOKIE_IMPORT,
    EXTENSION: messages.enums.credentialSource.EXTENSION,
  } as const;
  const [manualDialogState, setManualDialogState] =
    useState<ManualBindingDialogState>(null);
  const [browserDialogOpen, setBrowserDialogOpen] = useState(false);
  const [validateState, validateAction, isValidatePending] = useActionState(
    revalidateBindingAction,
    initialActionState,
  );
  const [manualCrawlState, manualCrawlAction, isManualCrawlPending] =
    useActionState(triggerManualCrawlAction, initialActionState);
  const [disableState, disableAction, isDisablePending] = useActionState(
    disableBindingAction,
    initialActionState,
  );
  const [unbindState, unbindAction, isUnbindPending] = useActionState(
    unbindBindingAction,
    initialActionState,
  );
  const [browserSession, setBrowserSession] =
    useState<BindingBrowserSessionRecord | null>(null);
  const [browserSessionError, setBrowserSessionError] = useState<string | null>(
    null,
  );
  const [isBrowserSessionPending, startBrowserSessionTransition] =
    useTransition();
  const refreshedBrowserSessionIdRef = useRef<string | null>(null);
  const isBrowserSessionPollingRef = useRef(false);

  const editingBinding =
    manualDialogState?.type === "edit"
      ? bindings.find((binding) => binding.id === manualDialogState.bindingId) ??
        null
      : null;

  useEffect(() => {
    const storedSessionId = window.sessionStorage.getItem(
      browserBindingSessionStorageKey,
    );

    if (!storedSessionId) {
      return;
    }

    let cancelled = false;

    async function restoreBrowserSession() {
      try {
        const nextSession =
          await requestBrowserSession<BindingBrowserSessionRecord>(
            `/api/bindings/browser-sessions/${storedSessionId}`,
            messages.bindings.browserSessionRequestFailed,
          );

        if (cancelled) {
          return;
        }

        setBrowserSession(nextSession);
        setBrowserSessionError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setBrowserSessionError(
          error instanceof Error
            ? error.message
            : messages.bindings.browserSessionRestoreFailed,
        );
        window.sessionStorage.removeItem(browserBindingSessionStorageKey);
      }
    }

    void restoreBrowserSession();

    return () => {
      cancelled = true;
    };
  }, [messages.bindings.browserSessionRequestFailed, messages.bindings.browserSessionRestoreFailed]);

  useEffect(() => {
    if (!browserSession) {
      window.sessionStorage.removeItem(browserBindingSessionStorageKey);
      return;
    }

    if (isBrowserSessionActive(browserSession.status)) {
      window.sessionStorage.setItem(
        browserBindingSessionStorageKey,
        browserSession.id,
      );
      return;
    }

    window.sessionStorage.removeItem(browserBindingSessionStorageKey);
  }, [browserSession]);

  useEffect(() => {
    if (!browserSession || !isBrowserSessionActive(browserSession.status)) {
      return;
    }

    let cancelled = false;
    const sessionId = browserSession.id;

    async function pollBrowserSession() {
      if (isBrowserSessionPollingRef.current) {
        return;
      }

      isBrowserSessionPollingRef.current = true;

      try {
        const nextSession =
          await requestBrowserSession<BindingBrowserSessionRecord>(
            `/api/bindings/browser-sessions/${sessionId}`,
            messages.bindings.browserSessionRequestFailed,
          );

        if (cancelled) {
          return;
        }

        setBrowserSession(nextSession);
        setBrowserSessionError(null);

        if (
          nextSession.status === "SUCCESS" &&
          refreshedBrowserSessionIdRef.current !== nextSession.id
        ) {
          refreshedBrowserSessionIdRef.current = nextSession.id;
          router.refresh();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setBrowserSessionError(
          error instanceof Error
            ? error.message
            : messages.bindings.browserSessionPollingFailed,
        );
      } finally {
        isBrowserSessionPollingRef.current = false;
      }
    }

    void pollBrowserSession();

    const timer = window.setInterval(() => {
      void pollBrowserSession();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    browserSession,
    messages.bindings.browserSessionPollingFailed,
    messages.bindings.browserSessionRequestFailed,
    router,
  ]);

  useEffect(() => {
    if (manualDialogState?.type !== "edit") {
      return;
    }

    if (editingBinding) {
      return;
    }

    setManualDialogState(null);
  }, [editingBinding, manualDialogState]);

  function handleStartBrowserBinding() {
    const remoteDesktopWindow = browserDesktopUrl
      ? window.open(browserDesktopUrl, "_blank")
      : null;

    startBrowserSessionTransition(() => {
      void (async () => {
        try {
          const nextSession =
            await requestBrowserSession<BindingBrowserSessionRecord>(
              "/api/bindings/browser-sessions",
              messages.bindings.browserSessionRequestFailed,
              {
                method: "POST",
              },
            );

          refreshedBrowserSessionIdRef.current = null;
          setBrowserSession(nextSession);
          setBrowserSessionError(null);
        } catch (error) {
          remoteDesktopWindow?.close();
          setBrowserSessionError(
            error instanceof Error
              ? error.message
              : messages.bindings.browserSessionStartFailed,
          );
        }
      })();
    });
  }

  function handleCancelBrowserBinding() {
    if (!browserSession) {
      return;
    }

    startBrowserSessionTransition(() => {
      void (async () => {
        try {
          const nextSession =
            await requestBrowserSession<BindingBrowserSessionRecord>(
              `/api/bindings/browser-sessions/${browserSession.id}/cancel`,
              messages.bindings.browserSessionRequestFailed,
              {
                method: "POST",
              },
            );

          setBrowserSession(nextSession);
          setBrowserSessionError(null);
        } catch (error) {
          setBrowserSessionError(
            error instanceof Error
              ? error.message
              : messages.bindings.browserSessionCancelFailed,
          );
        }
      })();
    });
  }

  function handleUnbindSubmit(event: React.FormEvent<HTMLFormElement>) {
    const confirmed = window.confirm(messages.bindings.unbindConfirm);

    if (!confirmed) {
      event.preventDefault();
    }
  }

  const feedbackStates = [
    manualCrawlState,
    validateState,
    disableState,
    unbindState,
  ].filter((state) => state.error || state.success);

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-white/92 dark:border-white/10 dark:bg-white/6">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">
                {messages.bindings.accountListTitle}
              </CardTitle>
              <CardDescription className="mt-2 max-w-3xl leading-6">
                {messages.bindings.accountListDescription}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full bg-[#edf6fb] text-[#145375] dark:bg-white/8 dark:text-sky-200">
                {formatMessage(messages.bindings.accountCount, {
                  count: bindings.length,
                })}
              </Badge>
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-5"
                onClick={() => setBrowserDialogOpen(true)}
              >
                {messages.bindings.browserAssistTitle}
              </Button>
              <Button
                type="button"
                className="rounded-full bg-[linear-gradient(135deg,#145375,#0b6b88)] px-5 text-white hover:brightness-105"
                onClick={() => setManualDialogState({ type: "create" })}
              >
                {messages.bindings.advancedTitle}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-0">
          {browserSession || browserSessionError ? (
            <div className="mx-5 rounded-[1.5rem] border border-border/70 bg-[#f5f9fd] px-4 py-4 dark:border-white/10 dark:bg-white/8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {browserSession
                      ? messages.enums.browserSessionStatus[browserSession.status]
                      : messages.bindings.browserSessionRequestFailed}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {browserSessionError
                      ? browserSessionError
                      : browserSession?.username
                        ? `@${browserSession.username}`
                        : messages.bindings.browserFlowDescription}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full px-5"
                  onClick={() => setBrowserDialogOpen(true)}
                >
                  {messages.common.viewDetails}
                </Button>
              </div>
            </div>
          ) : null}

          {bindings.length > 0 ? (
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow className="border-y border-border/70 bg-[#f5f9fd] hover:bg-[#f5f9fd] dark:border-white/10 dark:bg-white/8">
                  <TableHead className="px-5">
                    {messages.common.accountLabel}
                  </TableHead>
                  <TableHead>{messages.bindings.displayName}</TableHead>
                  <TableHead>{messages.common.statusLabel}</TableHead>
                  <TableHead>{messages.bindings.credentialSource}</TableHead>
                  <TableHead>{messages.bindings.lastValidatedAt}</TableHead>
                  <TableHead>{messages.bindings.nextCrawlAt}</TableHead>
                  <TableHead>{messages.strategies.strategyCountLabel}</TableHead>
                  <TableHead className="whitespace-normal">
                    {messages.bindings.latestError}
                  </TableHead>
                  <TableHead className="px-5 text-right">
                    {messages.common.actionsLabel}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bindings.map((binding) => (
                  <TableRow
                    key={binding.id}
                    className="border-border/70 dark:border-white/10"
                  >
                    <TableCell className="px-5 align-top whitespace-normal">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          @{binding.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {binding.xUserId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {binding.displayName ?? messages.common.noDisplayName}
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge
                        label={messages.enums.bindingStatus[binding.status]}
                        status={binding.status}
                      />
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {credentialSourceLabels[binding.credentialSource]}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {formatDateTime(
                        binding.lastValidatedAt,
                        locale,
                        messages.common.notRecorded,
                      )}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {formatDateTime(
                        getNextStrategyRunAt(binding) ??
                          binding.crawlJob?.nextRunAt ??
                          binding.nextCrawlAt,
                        locale,
                        messages.common.notScheduled,
                      )}
                    </TableCell>
                    <TableCell className="align-top whitespace-normal">
                      {formatMessage(messages.strategies.strategyCount, {
                        count: binding.crawlProfiles.length,
                      })}
                    </TableCell>
                    <TableCell className="max-w-[280px] align-top whitespace-normal">
                      <span className="text-sm text-muted-foreground">
                        {binding.lastErrorMessage ?? messages.common.notRecorded}
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
                            setManualDialogState({
                              type: "edit",
                              bindingId: binding.id,
                            })
                          }
                        >
                          {messages.common.edit}
                        </Button>

                        <form action={manualCrawlAction}>
                          <input type="hidden" name="bindingId" value={binding.id} />
                          <Button
                            type="submit"
                            size="sm"
                            className="rounded-full bg-[#7f5a26] px-3 text-white hover:bg-[#65471f] dark:bg-[#f2c58c] dark:text-[#2c2114] dark:hover:bg-[#e5b775]"
                            disabled={
                              isManualCrawlPending || binding.status !== "ACTIVE"
                            }
                          >
                            {messages.bindings.triggerNow}
                          </Button>
                        </form>

                        <form action={validateAction}>
                          <input type="hidden" name="bindingId" value={binding.id} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="rounded-full px-3"
                            disabled={isValidatePending}
                          >
                            {messages.bindings.revalidate}
                          </Button>
                        </form>

                        <form action={disableAction}>
                          <input type="hidden" name="bindingId" value={binding.id} />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="rounded-full px-3"
                            disabled={
                              isDisablePending || binding.status === "DISABLED"
                            }
                          >
                            {messages.bindings.disable}
                          </Button>
                        </form>

                        <form action={unbindAction} onSubmit={handleUnbindSubmit}>
                          <input type="hidden" name="bindingId" value={binding.id} />
                          <Button
                            type="submit"
                            variant="destructive"
                            size="sm"
                            className="rounded-full px-3"
                            disabled={isUnbindPending}
                          >
                            {messages.bindings.unbind}
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 pb-5">
              <EmptyState
                title={messages.bindings.emptyTitle}
                description={messages.bindings.emptyDescription}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {feedbackStates.length > 0 ? (
        <div className="space-y-3">
          {feedbackStates.map((state, index) => (
            <ActionFeedback
              key={`${state.success ?? state.error ?? "binding-feedback"}-${index}`}
              state={state}
            />
          ))}
        </div>
      ) : null}

      {manualDialogState ? (
        <BindingManualDialog
          binding={editingBinding}
          locale={locale}
          onClose={() => setManualDialogState(null)}
        />
      ) : null}

      {browserDialogOpen ? (
        <BindingBrowserDialog
          browserDesktopUrl={browserDesktopUrl}
          browserSession={browserSession}
          browserSessionError={browserSessionError}
          hasBindings={bindings.length > 0}
          isBrowserSessionPending={isBrowserSessionPending}
          locale={locale}
          onCancel={handleCancelBrowserBinding}
          onClose={() => setBrowserDialogOpen(false)}
          onRefresh={() => router.refresh()}
          onStart={handleStartBrowserBinding}
        />
      ) : null}
    </div>
  );
}
