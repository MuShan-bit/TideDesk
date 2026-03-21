"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createModelAction,
  createProviderAction,
  setDefaultModelAction,
  testProviderAction,
  type AiActionState,
  updateModelAction,
  updateProviderAction,
} from "./actions";
import type {
  AiModelRecord,
  AiProviderRecord,
  AiTaskAuditRecord,
  AiTaskStatus,
  AiTaskType,
  AiUsageSummaryRecord,
} from "./ai-types";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
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
import { cn } from "@/lib/utils";

type AiConsoleProps = {
  loadError?: string | null;
  locale: Locale;
  models: AiModelRecord[];
  providers: AiProviderRecord[];
  taskRecords: AiTaskAuditRecord[];
  usageLoadError?: string | null;
  usageSummary: AiUsageSummaryRecord | null;
};

type ProviderDialogState =
  | { mode: "create" }
  | { mode: "edit"; providerId: string }
  | null;

type ModelDialogState =
  | { mode: "create" }
  | { mode: "edit"; modelId: string }
  | null;

const initialActionState: AiActionState = {};

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatParameters(value: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) {
    return "";
  }

  return JSON.stringify(value, null, 2);
}

function formatNumberValue(value: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

function formatPercentValue(value: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsdValue(value: number, locale: Locale) {
  const fractionDigits = value !== 0 && value < 0.01 ? 6 : 2;

  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Math.min(fractionDigits, 2),
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function formatOptionalDecimalInput(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function ActionFeedback({ state }: { state: AiActionState }) {
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
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  toneClassName,
  value,
}: {
  label: string;
  toneClassName: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-white/88 p-5 shadow-[0_20px_60px_-42px_rgba(45,77,63,0.3)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_20px_60px_-42px_rgba(0,0,0,0.5)]">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            toneClassName,
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function getStatusBadgeClassName(enabled: boolean) {
  return enabled
    ? "bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]"
    : "bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]";
}

function getTaskStatusBadgeClassName(status: AiTaskStatus) {
  switch (status) {
    case "SUCCESS":
      return "bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]";
    case "RUNNING":
      return "bg-[#e9f0f5] text-[#274a67] dark:bg-[#203544] dark:text-[#d7e5ef]";
    case "FAILED":
      return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200";
    case "CANCELLED":
      return "bg-[#f3ecfb] text-[#5a3d84] dark:bg-[#31243e] dark:text-[#d9c7ef]";
    default:
      return "bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]";
  }
}

function ProviderDialogForm({
  dialogState,
  locale,
  onClose,
  providers,
}: {
  dialogState: Exclude<ProviderDialogState, null>;
  locale: Locale;
  onClose: () => void;
  providers: AiProviderRecord[];
}) {
  const messages = getMessages(locale);
  const editingProvider =
    dialogState.mode === "edit"
      ? (providers.find((provider) => provider.id === dialogState.providerId) ??
        null)
      : null;
  const [createState, createAction, isCreatePending] = useActionState(
    createProviderAction,
    initialActionState,
  );
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateProviderAction,
    initialActionState,
  );
  const [enabled, setEnabled] = useState(editingProvider?.enabled ?? true);

  useEffect(() => {
    setEnabled(editingProvider?.enabled ?? true);
  }, [editingProvider?.enabled, dialogState.mode]);

  const activeState = dialogState.mode === "create" ? createState : updateState;
  const action = dialogState.mode === "create" ? createAction : updateAction;
  const isPending =
    dialogState.mode === "create" ? isCreatePending : isUpdatePending;

  useEffect(() => {
    if (activeState.success) {
      onClose();
    }
  }, [activeState.success, onClose]);

  if (dialogState.mode === "edit" && !editingProvider) {
    return null;
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-none rounded-[2rem] border-border/70 bg-white p-0 dark:border-white/10 dark:bg-[#111713]"
        style={{ maxWidth: "56rem", width: "min(96vw, 56rem)" }}
      >
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {dialogState.mode === "create"
                ? messages.ai.createProvider
                : messages.ai.editProvider}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {dialogState.mode === "create"
                ? messages.ai.createProviderDescription
                : messages.ai.editProviderDescription}
            </DialogDescription>
          </DialogHeader>

          <form action={action} className="space-y-5">
            {dialogState.mode === "edit" ? (
              <input
                name="providerId"
                type="hidden"
                value={editingProvider!.id}
              />
            ) : null}
            <input name="enabled" type="hidden" value={String(enabled)} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="provider-name">
                  {messages.ai.providerNameLabel}
                </FieldLabel>
                <Input
                  id="provider-name"
                  name="name"
                  defaultValue={editingProvider?.name ?? ""}
                  placeholder={messages.ai.form.providerNamePlaceholder}
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="provider-type">
                  {messages.ai.providerTypeLabel}
                </FieldLabel>
                <select
                  id="provider-type"
                  name="providerType"
                  defaultValue={editingProvider?.providerType ?? "OPENAI"}
                  className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
                >
                  <option value="OPENAI">
                    {messages.enums.aiProviderType.OPENAI}
                  </option>
                  <option value="OPENAI_COMPATIBLE">
                    {messages.enums.aiProviderType.OPENAI_COMPATIBLE}
                  </option>
                  <option value="ANTHROPIC">
                    {messages.enums.aiProviderType.ANTHROPIC}
                  </option>
                  <option value="GEMINI">
                    {messages.enums.aiProviderType.GEMINI}
                  </option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="provider-base-url">
                  {messages.ai.baseUrlLabel}
                </FieldLabel>
                <Input
                  id="provider-base-url"
                  name="baseUrl"
                  defaultValue={editingProvider?.baseUrl ?? ""}
                  placeholder={messages.ai.form.baseUrlPlaceholder}
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="provider-api-key">
                  {messages.ai.apiKeyLabel}
                </FieldLabel>
                <Input
                  id="provider-api-key"
                  name="apiKey"
                  defaultValue=""
                  placeholder={messages.ai.form.apiKeyPlaceholder}
                  type="password"
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  {messages.ai.apiKeyHint}
                </p>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-[#f8faf8] px-4 py-3 text-sm text-foreground dark:border-white/10 dark:bg-white/8">
              <input
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                type="checkbox"
              />
              <span>{messages.ai.enabledLabel}</span>
            </label>

            <ActionFeedback state={activeState} />

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-4"
                onClick={onClose}
              >
                {messages.taxonomy.cancel}
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#244034] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c7d4cc]"
                disabled={isPending}
              >
                {isPending
                  ? messages.taxonomy.saving
                  : messages.ai.saveProvider}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModelDialogForm({
  dialogState,
  locale,
  models,
  onClose,
  providers,
}: {
  dialogState: Exclude<ModelDialogState, null>;
  locale: Locale;
  models: AiModelRecord[];
  onClose: () => void;
  providers: AiProviderRecord[];
}) {
  const messages = getMessages(locale);
  const editingModel =
    dialogState.mode === "edit"
      ? (models.find((model) => model.id === dialogState.modelId) ?? null)
      : null;
  const [createState, createAction, isCreatePending] = useActionState(
    createModelAction,
    initialActionState,
  );
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateModelAction,
    initialActionState,
  );
  const [enabled, setEnabled] = useState(editingModel?.enabled ?? true);
  const [isDefault, setIsDefault] = useState(editingModel?.isDefault ?? false);

  useEffect(() => {
    setEnabled(editingModel?.enabled ?? true);
    setIsDefault(editingModel?.isDefault ?? false);
  }, [
    editingModel?.enabled,
    editingModel?.id,
    editingModel?.isDefault,
    dialogState.mode,
  ]);

  useEffect(() => {
    if (!enabled && isDefault) {
      setIsDefault(false);
    }
  }, [enabled, isDefault]);

  const activeState = dialogState.mode === "create" ? createState : updateState;
  const action = dialogState.mode === "create" ? createAction : updateAction;
  const isPending =
    dialogState.mode === "create" ? isCreatePending : isUpdatePending;

  useEffect(() => {
    if (activeState.success) {
      onClose();
    }
  }, [activeState.success, onClose]);

  if (dialogState.mode === "edit" && !editingModel) {
    return null;
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-none rounded-[2rem] border-border/70 bg-white p-0 dark:border-white/10 dark:bg-[#111713]"
        style={{ maxWidth: "64rem", width: "min(96vw, 64rem)" }}
      >
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">
              {dialogState.mode === "create"
                ? messages.ai.createModel
                : messages.ai.editModel}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {dialogState.mode === "create"
                ? messages.ai.createModelDescription
                : messages.ai.editModelDescription}
            </DialogDescription>
          </DialogHeader>

          <form action={action} className="space-y-5">
            {dialogState.mode === "edit" ? (
              <input name="modelId" type="hidden" value={editingModel!.id} />
            ) : null}
            <input name="enabled" type="hidden" value={String(enabled)} />
            <input name="isDefault" type="hidden" value={String(isDefault)} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="model-provider">
                  {messages.ai.providerNameLabel}
                </FieldLabel>
                <select
                  id="model-provider"
                  name="providerConfigId"
                  defaultValue={editingModel?.providerConfigId ?? ""}
                  className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
                >
                  <option value="">
                    {messages.ai.form.providerSelectPlaceholder}
                  </option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="model-task-type">
                  {messages.ai.taskTypeLabel}
                </FieldLabel>
                <select
                  id="model-task-type"
                  name="taskType"
                  defaultValue={editingModel?.taskType ?? "POST_CLASSIFY"}
                  className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
                >
                  <option value="POST_CLASSIFY">
                    {messages.enums.aiTaskType.POST_CLASSIFY}
                  </option>
                  <option value="REPORT_SUMMARY">
                    {messages.enums.aiTaskType.REPORT_SUMMARY}
                  </option>
                  <option value="DRAFT_REWRITE">
                    {messages.enums.aiTaskType.DRAFT_REWRITE}
                  </option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="model-code">
                  {messages.ai.modelCodeLabel}
                </FieldLabel>
                <Input
                  id="model-code"
                  name="modelCode"
                  defaultValue={editingModel?.modelCode ?? ""}
                  placeholder={messages.ai.form.modelCodePlaceholder}
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="model-display-name">
                  {messages.ai.modelDisplayNameLabel}
                </FieldLabel>
                <Input
                  id="model-display-name"
                  name="displayName"
                  defaultValue={editingModel?.displayName ?? ""}
                  placeholder={messages.ai.form.modelDisplayNamePlaceholder}
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="model-input-token-price">
                  {messages.ai.inputTokenPriceLabel}
                </FieldLabel>
                <Input
                  id="model-input-token-price"
                  name="inputTokenPriceUsd"
                  type="number"
                  min="0"
                  step="0.000001"
                  defaultValue={formatOptionalDecimalInput(
                    editingModel?.inputTokenPriceUsd,
                  )}
                  placeholder="0.001500"
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                />
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="model-output-token-price">
                  {messages.ai.outputTokenPriceLabel}
                </FieldLabel>
                <Input
                  id="model-output-token-price"
                  name="outputTokenPriceUsd"
                  type="number"
                  min="0"
                  step="0.000001"
                  defaultValue={formatOptionalDecimalInput(
                    editingModel?.outputTokenPriceUsd,
                  )}
                  placeholder="0.006000"
                  className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                />
              </div>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {messages.ai.tokenPriceHint}
            </p>

            <div className="space-y-2">
              <FieldLabel htmlFor="model-parameters">
                {messages.ai.parametersLabel}
              </FieldLabel>
              <textarea
                id="model-parameters"
                name="parametersJson"
                defaultValue={formatParameters(
                  editingModel?.parametersJson ?? {},
                )}
                placeholder={messages.ai.form.parametersPlaceholder}
                className="min-h-40 w-full rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {messages.ai.parametersHint}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-[#f8faf8] px-4 py-3 text-sm text-foreground dark:border-white/10 dark:bg-white/8">
                <input
                  checked={enabled}
                  onChange={(event) => setEnabled(event.target.checked)}
                  type="checkbox"
                />
                <span>{messages.ai.enabledLabel}</span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border/70 bg-[#f8faf8] px-4 py-3 text-sm text-foreground dark:border-white/10 dark:bg-white/8",
                  !enabled && "opacity-60",
                )}
              >
                <input
                  checked={isDefault}
                  disabled={!enabled}
                  onChange={(event) => setIsDefault(event.target.checked)}
                  type="checkbox"
                />
                <span>{messages.ai.defaultLabel}</span>
              </label>
            </div>

            <ActionFeedback state={activeState} />

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full px-4"
                onClick={onClose}
              >
                {messages.taxonomy.cancel}
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#244034] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c7d4cc]"
                disabled={isPending}
              >
                {isPending ? messages.taxonomy.saving : messages.ai.saveModel}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProviderCard({
  locale,
  provider,
  testAction,
  testPending,
  onEdit,
}: {
  locale: Locale;
  onEdit: () => void;
  provider: AiProviderRecord;
  testAction: (formData: FormData) => void;
  testPending: boolean;
}) {
  const messages = getMessages(locale);

  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-[#fbfcfb] p-5 dark:border-white/10 dark:bg-white/6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              {provider.name}
            </h3>
            <Badge className="rounded-full bg-[#e9f0f5] text-[#274a67] dark:bg-[#203544] dark:text-[#d7e5ef]">
              {messages.enums.aiProviderType[provider.providerType]}
            </Badge>
            <Badge
              className={cn(
                "rounded-full",
                getStatusBadgeClassName(provider.enabled),
              )}
            >
              {provider.enabled
                ? messages.ai.enabledBadge
                : messages.ai.disabledBadge}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {messages.ai.baseUrlLabel}:{" "}
              {provider.baseUrl ?? messages.ai.noBaseUrl}
            </span>
            <span>·</span>
            <span>
              {provider.hasApiKey
                ? messages.ai.hasApiKey
                : messages.ai.missingApiKey}
            </span>
            <span>·</span>
            <span>
              {formatMessage(messages.ai.modelCountLabel, {
                count: provider.models.length,
              })}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full px-4"
            onClick={onEdit}
          >
            {messages.ai.edit}
          </Button>
          <form action={testAction}>
            <input name="providerId" type="hidden" value={provider.id} />
            <Button
              type="submit"
              className="rounded-full bg-[#2d4d3f] px-4 text-white hover:bg-[#244034] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c7d4cc]"
              disabled={testPending || provider.models.length === 0}
            >
              {testPending
                ? messages.ai.testingProvider
                : messages.ai.testProvider}
            </Button>
          </form>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {provider.models.length > 0
          ? messages.ai.testWithDefaultModel
          : messages.ai.testRequiresModel}
      </p>

      {provider.models.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {provider.models.map((model) => (
            <Badge
              key={model.id}
              className={cn(
                "rounded-full",
                model.isDefault
                  ? "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]"
                  : "bg-white text-foreground dark:bg-white/10",
              )}
            >
              {model.displayName}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ModelTaskBadge({
  locale,
  taskType,
}: {
  locale: Locale;
  taskType: AiTaskType;
}) {
  const messages = getMessages(locale);

  return (
    <Badge className="rounded-full bg-[#f1efe7] text-[#6b5527] dark:bg-[#3d3124] dark:text-[#f2c58c]">
      {messages.enums.aiTaskType[taskType]}
    </Badge>
  );
}

function ModelCard({
  defaultPending,
  locale,
  model,
  onEdit,
  setDefaultAction,
  testAction,
  testPending,
}: {
  defaultPending: boolean;
  locale: Locale;
  model: AiModelRecord;
  onEdit: () => void;
  setDefaultAction: (formData: FormData) => void;
  testAction: (formData: FormData) => void;
  testPending: boolean;
}) {
  const messages = getMessages(locale);
  const parameterText = formatParameters(model.parametersJson);
  const inputTokenPriceText =
    model.inputTokenPriceUsd === null
      ? messages.ai.noTokenPrice
      : formatMessage(messages.ai.tokenPriceValue, {
          value: formatUsdValue(model.inputTokenPriceUsd, locale),
        });
  const outputTokenPriceText =
    model.outputTokenPriceUsd === null
      ? messages.ai.noTokenPrice
      : formatMessage(messages.ai.tokenPriceValue, {
          value: formatUsdValue(model.outputTokenPriceUsd, locale),
        });

  return (
    <div className="rounded-[1.75rem] border border-border/70 bg-[#fbfcfb] p-5 dark:border-white/10 dark:bg-white/6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              {model.displayName}
            </h3>
            <ModelTaskBadge locale={locale} taskType={model.taskType} />
            {model.isDefault ? (
              <Badge className="rounded-full bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]">
                {messages.ai.defaultBadge}
              </Badge>
            ) : null}
            <Badge
              className={cn(
                "rounded-full",
                getStatusBadgeClassName(model.enabled),
              )}
            >
              {model.enabled
                ? messages.ai.enabledBadge
                : messages.ai.disabledBadge}
            </Badge>
          </div>
          <div className="text-sm leading-6 text-muted-foreground">
            <p>{model.modelCode}</p>
            <p>
              {model.provider.name} ·{" "}
              {messages.enums.aiProviderType[model.provider.providerType]}
            </p>
            <p>
              {messages.ai.inputTokenPriceLabel}: {inputTokenPriceText} ·{" "}
              {messages.ai.outputTokenPriceLabel}: {outputTokenPriceText}
            </p>
            <p>{formatDateTime(model.updatedAt, locale)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full px-4"
            onClick={onEdit}
          >
            {messages.ai.edit}
          </Button>
          {!model.isDefault ? (
            <form action={setDefaultAction}>
              <input name="modelId" type="hidden" value={model.id} />
              <Button
                type="submit"
                variant="outline"
                className="rounded-full px-4"
                disabled={defaultPending || !model.enabled}
              >
                {messages.ai.setAsDefault}
              </Button>
            </form>
          ) : null}
          <form action={testAction}>
            <input
              name="providerId"
              type="hidden"
              value={model.providerConfigId}
            />
            <input name="modelConfigId" type="hidden" value={model.id} />
            <Button
              type="submit"
              className="rounded-full bg-[#2d4d3f] px-4 text-white hover:bg-[#244034] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c7d4cc]"
              disabled={testPending}
            >
              {testPending
                ? messages.ai.testingProvider
                : messages.ai.testProvider}
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-border/60 bg-white/80 px-4 py-3 dark:border-white/8 dark:bg-white/4">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {messages.ai.parametersLabel}
        </p>
        <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
          {parameterText || messages.ai.noParameters}
        </pre>
      </div>
    </div>
  );
}

function UsageBreakdownList({
  emptyLabel,
  items,
}: {
  emptyLabel: string;
  items: Array<{
    id: string;
    label: string;
    meta: string;
  }>;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-[1.25rem] border border-border/60 bg-white/80 px-4 py-3 dark:border-white/8 dark:bg-white/4"
        >
          <p className="text-sm font-medium text-foreground">{item.label}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {item.meta}
          </p>
        </div>
      ))}
    </div>
  );
}

function TaskAuditRecordCard({
  locale,
  record,
}: {
  locale: Locale;
  record: AiTaskAuditRecord;
}) {
  const messages = getMessages(locale);

  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-[#fbfcfb] p-5 dark:border-white/10 dark:bg-white/6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ModelTaskBadge locale={locale} taskType={record.taskType} />
            <Badge
              className={cn(
                "rounded-full",
                getTaskStatusBadgeClassName(record.status),
              )}
            >
              {messages.enums.aiTaskStatus[record.status]}
            </Badge>
            {record.rateLimitScope ? (
              <Badge className="rounded-full bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200">
                {messages.ai.rateLimitedBadge}
              </Badge>
            ) : null}
          </div>
          <div className="space-y-1 text-sm leading-6 text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              {record.model?.displayName ?? messages.ai.auditNoModel}
            </p>
            <p>
              {record.provider?.name ?? messages.ai.auditNoProvider}
              {record.provider
                ? ` · ${messages.enums.aiProviderType[record.provider.providerType]}`
                : ""}
            </p>
            <p>
              {messages.ai.auditTargetLabel}: {record.targetType} /{" "}
              {record.targetId}
            </p>
          </div>
        </div>

        <div className="space-y-1 text-right text-sm leading-6 text-muted-foreground">
          <p>
            {messages.ai.auditTokensLabel}:{" "}
            {formatNumberValue(record.totalTokens ?? 0, locale)}
          </p>
          <p>
            {messages.ai.auditCostLabel}:{" "}
            {record.estimatedCostUsd === null
              ? messages.common.notRecorded
              : formatUsdValue(record.estimatedCostUsd, locale)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm leading-6 text-muted-foreground sm:grid-cols-2">
        <p>
          {messages.common.createdAt}: {formatDateTime(record.createdAt, locale)}
        </p>
        <p>
          {messages.common.finishedAt}:{" "}
          {record.finishedAt
            ? formatDateTime(record.finishedAt, locale)
            : messages.common.notRecorded}
        </p>
      </div>

      {record.errorMessage ? (
        <div className="mt-4 rounded-[1.25rem] bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:bg-red-950/30 dark:text-red-200">
          {record.errorMessage}
        </div>
      ) : null}
    </div>
  );
}

export function AiConsole({
  loadError,
  locale,
  models,
  providers,
  taskRecords,
  usageLoadError,
  usageSummary,
}: AiConsoleProps) {
  const messages = getMessages(locale);
  const [providerDialogState, setProviderDialogState] =
    useState<ProviderDialogState>(null);
  const [modelDialogState, setModelDialogState] =
    useState<ModelDialogState>(null);
  const [testState, testAction, isTestPending] = useActionState(
    testProviderAction,
    initialActionState,
  );
  const [defaultState, defaultAction, isDefaultPending] = useActionState(
    setDefaultModelAction,
    initialActionState,
  );

  const summary = useMemo(() => {
    const enabledProviderCount = providers.filter(
      (provider) => provider.enabled,
    ).length;
    const defaultTaskCount = new Set(
      models.filter((model) => model.isDefault).map((model) => model.taskType),
    ).size;

    return {
      enabledProviderCount,
      defaultTaskCount,
    };
  }, [models, providers]);
  const usageMetrics = useMemo(() => {
    if (!usageSummary) {
      return {
        successRate: 0,
        taskBreakdown: [],
        providerBreakdown: [],
      };
    }

    return {
      successRate:
        usageSummary.totalCalls > 0
          ? usageSummary.successCalls / usageSummary.totalCalls
          : 0,
      taskBreakdown: usageSummary.byTaskType.slice(0, 4).map((item) => ({
        id: item.taskType,
        label: messages.enums.aiTaskType[item.taskType],
        meta: formatMessage(messages.ai.breakdownMeta, {
          calls: formatNumberValue(item.calls, locale),
          tokens: formatNumberValue(item.totalTokens, locale),
          cost: formatUsdValue(item.estimatedCostUsd, locale),
        }),
      })),
      providerBreakdown: usageSummary.byProvider.slice(0, 4).map((item) => ({
        id: item.providerConfigId,
        label: `${item.providerName} · ${
          messages.enums.aiProviderType[item.providerType]
        }`,
        meta: formatMessage(messages.ai.breakdownMeta, {
          calls: formatNumberValue(item.calls, locale),
          tokens: formatNumberValue(item.totalTokens, locale),
          cost: formatUsdValue(item.estimatedCostUsd, locale),
        }),
      })),
    };
  }, [locale, messages, usageSummary]);

  return (
    <div className="space-y-6">
      {loadError ? (
        <ErrorState
          title={messages.ai.errorTitle}
          description={loadError ?? messages.ai.errorDescription}
        />
      ) : null}

      {testState.success || testState.error ? (
        <ActionFeedback state={testState} />
      ) : null}
      {defaultState.success || defaultState.error ? (
        <ActionFeedback state={defaultState} />
      ) : null}
      {usageLoadError ? <ActionFeedback state={{ error: usageLoadError }} /> : null}

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard
          label={messages.ai.summary.providerCount}
          toneClassName="bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]"
          value={String(providers.length)}
        />
        <SummaryCard
          label={messages.ai.summary.enabledProviders}
          toneClassName="bg-[#e9f0f5] text-[#274a67] dark:bg-[#203544] dark:text-[#d7e5ef]"
          value={String(summary.enabledProviderCount)}
        />
        <SummaryCard
          label={messages.ai.summary.modelCount}
          toneClassName="bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]"
          value={String(models.length)}
        />
        <SummaryCard
          label={messages.ai.summary.defaultTasks}
          toneClassName="bg-[#f3ecfb] text-[#5a3d84] dark:bg-[#31243e] dark:text-[#d9c7ef]"
          value={String(summary.defaultTaskCount)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard
          label={messages.ai.summary.totalCalls}
          toneClassName="bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]"
          value={
            usageSummary
              ? formatNumberValue(usageSummary.totalCalls, locale)
              : messages.common.notRecorded
          }
        />
        <SummaryCard
          label={messages.ai.summary.successRate}
          toneClassName="bg-[#e9f0f5] text-[#274a67] dark:bg-[#203544] dark:text-[#d7e5ef]"
          value={
            usageSummary
              ? formatPercentValue(usageMetrics.successRate, locale)
              : messages.common.notRecorded
          }
        />
        <SummaryCard
          label={messages.ai.summary.totalTokens}
          toneClassName="bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]"
          value={
            usageSummary
              ? formatNumberValue(usageSummary.totalTokens, locale)
              : messages.common.notRecorded
          }
        />
        <SummaryCard
          label={messages.ai.summary.totalCost}
          toneClassName="bg-[#f3ecfb] text-[#5a3d84] dark:bg-[#31243e] dark:text-[#d9c7ef]"
          value={
            usageSummary
              ? formatUsdValue(usageSummary.totalEstimatedCostUsd, locale)
              : messages.common.notRecorded
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[2rem] border-border/70 bg-white/78 py-0 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
          <CardHeader className="border-b border-border/60 px-6 py-5 dark:border-white/8">
            <div className="space-y-1">
              <CardTitle className="text-xl">{messages.ai.usageTitle}</CardTitle>
              <CardDescription className="max-w-xl leading-6">
                {usageSummary
                  ? formatMessage(messages.ai.usageDescription, {
                      days: usageSummary.rangeDays,
                    })
                  : messages.ai.usageEmptyDescription}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-6 py-6">
            {usageSummary ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-border/60 bg-white/80 px-4 py-4 dark:border-white/8 dark:bg-white/4">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {messages.ai.windowLimitTitle}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-foreground">
                      {formatMessage(messages.ai.windowLimitDescription, {
                        calls: formatNumberValue(
                          usageSummary.limits.recentWindowCalls,
                          locale,
                        ),
                        limit: formatNumberValue(
                          usageSummary.limits.maxRequestsPerWindow,
                          locale,
                        ),
                        seconds: formatNumberValue(
                          usageSummary.limits.windowSeconds,
                          locale,
                        ),
                      })}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {formatMessage(messages.ai.windowRemainingDescription, {
                        count: formatNumberValue(
                          usageSummary.limits.remainingWindowRequests,
                          locale,
                        ),
                      })}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-border/60 bg-white/80 px-4 py-4 dark:border-white/8 dark:bg-white/4">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      {messages.ai.dailyBudgetTitle}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-foreground">
                      {formatMessage(messages.ai.dailyBudgetDescription, {
                        used: formatNumberValue(
                          usageSummary.limits.dailyTokenUsage,
                          locale,
                        ),
                        limit: formatNumberValue(
                          usageSummary.limits.dailyTokenLimit,
                          locale,
                        ),
                      })}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {formatMessage(messages.ai.dailyBudgetRemainingDescription, {
                        count: formatNumberValue(
                          usageSummary.limits.remainingDailyTokens,
                          locale,
                        ),
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {messages.ai.taskBreakdownTitle}
                    </p>
                    <UsageBreakdownList
                      emptyLabel={messages.ai.breakdownEmpty}
                      items={usageMetrics.taskBreakdown}
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {messages.ai.providerBreakdownTitle}
                    </p>
                    <UsageBreakdownList
                      emptyLabel={messages.ai.breakdownEmpty}
                      items={usageMetrics.providerBreakdown}
                    />
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                title={messages.ai.usageEmptyTitle}
                description={messages.ai.usageEmptyDescription}
              />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/70 bg-white/78 py-0 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
          <CardHeader className="border-b border-border/60 px-6 py-5 dark:border-white/8">
            <div className="space-y-1">
              <CardTitle className="text-xl">{messages.ai.auditTitle}</CardTitle>
              <CardDescription className="max-w-xl leading-6">
                {messages.ai.auditDescription}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-6 py-6">
            {taskRecords.length === 0 ? (
              <EmptyState
                title={messages.ai.auditEmptyTitle}
                description={messages.ai.auditEmptyDescription}
              />
            ) : (
              taskRecords.map((record) => (
                <TaskAuditRecordCard
                  key={record.id}
                  locale={locale}
                  record={record}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card className="rounded-[2rem] border-border/70 bg-white/78 py-0 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
          <CardHeader className="border-b border-border/60 px-6 py-5 dark:border-white/8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-xl">
                  {messages.ai.providersTitle}
                </CardTitle>
                <CardDescription className="max-w-xl leading-6">
                  {messages.ai.providersDescription}
                </CardDescription>
              </div>
              <Button
                className="rounded-full bg-[#2d4d3f] px-4 text-white hover:bg-[#244034] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c7d4cc]"
                onClick={() => setProviderDialogState({ mode: "create" })}
              >
                {messages.ai.createProvider}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-6 py-6">
            {providers.length === 0 ? (
              <EmptyState
                title={messages.ai.providersEmptyTitle}
                description={messages.ai.providersEmptyDescription}
              />
            ) : (
              providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  locale={locale}
                  provider={provider}
                  testAction={testAction}
                  testPending={isTestPending}
                  onEdit={() =>
                    setProviderDialogState({
                      mode: "edit",
                      providerId: provider.id,
                    })
                  }
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/70 bg-white/78 py-0 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.35)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
          <CardHeader className="border-b border-border/60 px-6 py-5 dark:border-white/8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-xl">
                  {messages.ai.modelsTitle}
                </CardTitle>
                <CardDescription className="max-w-xl leading-6">
                  {messages.ai.modelsDescription}
                </CardDescription>
              </div>
              <Button
                className="rounded-full bg-[#2d4d3f] px-4 text-white hover:bg-[#244034] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c7d4cc]"
                disabled={providers.length === 0}
                onClick={() => setModelDialogState({ mode: "create" })}
              >
                {messages.ai.createModel}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-6 py-6">
            {models.length === 0 ? (
              <EmptyState
                title={messages.ai.modelsEmptyTitle}
                description={messages.ai.modelsEmptyDescription}
              />
            ) : (
              models.map((model) => (
                <ModelCard
                  key={model.id}
                  defaultPending={isDefaultPending}
                  locale={locale}
                  model={model}
                  setDefaultAction={defaultAction}
                  testAction={testAction}
                  testPending={isTestPending}
                  onEdit={() =>
                    setModelDialogState({
                      mode: "edit",
                      modelId: model.id,
                    })
                  }
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {providerDialogState ? (
        <ProviderDialogForm
          dialogState={providerDialogState}
          locale={locale}
          onClose={() => setProviderDialogState(null)}
          providers={providers}
        />
      ) : null}

      {modelDialogState ? (
        <ModelDialogForm
          dialogState={modelDialogState}
          locale={locale}
          models={models}
          onClose={() => setModelDialogState(null)}
          providers={providers}
        />
      ) : null}
    </div>
  );
}
