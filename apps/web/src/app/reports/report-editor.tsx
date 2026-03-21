"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  regenerateReportAction,
  updateReportAction,
  type ReportActionState,
} from "./actions";
import type { ReportDetailRecord } from "./report-types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getMessages, type Locale } from "@/lib/i18n";

const initialActionState: ReportActionState = {};

type ReportEditorProps = {
  bodyText: string;
  locale: Locale;
  report: Pick<ReportDetailRecord, "id" | "title">;
};

function ActionFeedback({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
        {success}
      </div>
    );
  }

  return null;
}

export function ReportEditor({ bodyText, locale, report }: ReportEditorProps) {
  const messages = getMessages(locale);
  const router = useRouter();
  const [updateState, updateFormAction, isUpdating] = useActionState(
    updateReportAction,
    initialActionState,
  );
  const [regenerateState, regenerateFormAction, isRegenerating] =
    useActionState(regenerateReportAction, initialActionState);

  useEffect(() => {
    if (updateState.success || regenerateState.success) {
      router.refresh();
    }
  }, [regenerateState.success, router, updateState.success]);

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
      <CardHeader>
        <CardTitle className="text-2xl">
          {messages.reportDetail.editorTitle}
        </CardTitle>
        <CardDescription className="leading-6">
          {messages.reportDetail.editorDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={updateFormAction} className="space-y-5">
          <input type="hidden" name="reportId" value={report.id} />
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="report-title"
            >
              {messages.reportDetail.titleLabel}
            </label>
            <Input
              id="report-title"
              name="title"
              defaultValue={report.title}
              className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="report-body"
            >
              {messages.reportDetail.bodyLabel}
            </label>
            <textarea
              id="report-body"
              name="bodyText"
              defaultValue={bodyText}
              className="min-h-72 w-full rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
              placeholder={messages.reportDetail.bodyPlaceholder}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              {messages.reportDetail.bodyHint}
            </p>
          </div>
          <ActionFeedback error={updateState.error} success={updateState.success} />
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="submit"
              disabled={isUpdating}
              className="h-11 rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            >
              {isUpdating
                ? messages.reportDetail.saving
                : messages.reportDetail.save}
            </Button>
          </div>
        </form>

        <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              {messages.reportDetail.regenerateTitle}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {messages.reportDetail.regenerateDescription}
            </p>
          </div>
          <form action={regenerateFormAction} className="mt-4 space-y-4">
            <input type="hidden" name="reportId" value={report.id} />
            <ActionFeedback
              error={regenerateState.error}
              success={regenerateState.success}
            />
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="submit"
                disabled={isRegenerating}
                variant="outline"
                className="h-11 rounded-full px-5"
              >
                {isRegenerating
                  ? messages.reportDetail.regenerating
                  : messages.reportDetail.regenerate}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
