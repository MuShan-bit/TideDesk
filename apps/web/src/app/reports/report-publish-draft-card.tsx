"use client";

import { useActionState } from "react";
import { SendHorizonal } from "lucide-react";
import {
  createPublishDraftFromReportAction,
  type PublishDraftActionState,
} from "@/app/publishing/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMessages, type Locale } from "@/lib/i18n";

const initialState: PublishDraftActionState = {};

type ReportPublishDraftCardProps = {
  locale: Locale;
  reportId: string;
};

export function ReportPublishDraftCard({
  locale,
  reportId,
}: ReportPublishDraftCardProps) {
  const messages = getMessages(locale);
  const [state, formAction, isPending] = useActionState(
    createPublishDraftFromReportAction,
    initialState,
  );

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
            <SendHorizonal className="size-5" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              {messages.reportDetail.publishTitle}
            </CardTitle>
            <CardDescription className="leading-6">
              {messages.reportDetail.publishDescription}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-3xl border border-dashed border-border/70 bg-[#fcfaf5] p-5 text-sm leading-6 text-muted-foreground dark:border-white/10 dark:bg-white/8">
          {messages.reportDetail.publishPendingHint}
        </div>

        {state.error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
            {state.error}
          </div>
        ) : null}

        <form action={formAction}>
          <input type="hidden" name="reportId" value={reportId} />
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
          >
            {isPending
              ? messages.reportDetail.publishActionPending
              : messages.reportDetail.publishAction}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
