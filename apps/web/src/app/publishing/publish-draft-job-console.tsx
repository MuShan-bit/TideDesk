"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo } from "react";
import { ExternalLink, SendHorizonal } from "lucide-react";
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
import { getMessages, type Locale } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import {
  executePublishDraftAction,
  type PublishDraftActionState,
} from "./actions";
import type { PublishDraftDetailRecord } from "./publish-draft-types";

const initialActionState: PublishDraftActionState = {};

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

type PublishDraftJobConsoleProps = {
  draft: PublishDraftDetailRecord;
  locale: Locale;
};

export function PublishDraftJobConsole({
  draft,
  locale,
}: PublishDraftJobConsoleProps) {
  const messages = getMessages(locale);
  const router = useRouter();
  const [actionState, executeFormAction, isExecuting] = useActionState(
    executePublishDraftAction,
    initialActionState,
  );
  const latestJobsByChannel = useMemo(() => {
    const map = new Map<string, PublishDraftDetailRecord["publishJobs"][number]>();

    draft.publishJobs.forEach((job) => {
      if (!map.has(job.channelBinding.id)) {
        map.set(job.channelBinding.id, job);
      }
    });

    return map;
  }, [draft.publishJobs]);
  const pendingChannels = draft.targetChannels.filter((item) => {
    const latestJob = latestJobsByChannel.get(item.channelBinding.id);

    return latestJob?.status !== "SUCCESS";
  });

  useEffect(() => {
    if (actionState.success) {
      router.refresh();
    }
  }, [actionState.success, router]);

  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
              <SendHorizonal className="size-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                {messages.publishDraftDetail.jobsTitle}
              </CardTitle>
              <CardDescription className="leading-6">
                {messages.publishDraftDetail.jobsDescription}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {draft.targetChannels.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
                <div className="space-y-1">
                  <p className="text-base font-semibold text-foreground">
                    {messages.publishDraftDetail.executionTitle}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {messages.publishDraftDetail.executionDescription}
                  </p>
                </div>
                <form action={executeFormAction}>
                  <input type="hidden" name="draftId" value={draft.id} />
                  <Button
                    type="submit"
                    disabled={isExecuting || pendingChannels.length === 0}
                    className="h-11 rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                  >
                    {isExecuting
                      ? messages.publishDraftDetail.publishPending
                      : messages.publishDraftDetail.publishAllAction}
                  </Button>
                </form>
              </div>

              <div className="space-y-3">
                {draft.targetChannels.map((item) => {
                  const latestJob = latestJobsByChannel.get(item.channelBinding.id);
                  const actionLabel =
                    latestJob?.status === "FAILED"
                      ? messages.publishDraftDetail.retrySingleAction
                      : messages.publishDraftDetail.publishSingleAction;
                  const actionDisabled =
                    isExecuting ||
                    latestJob?.status === "SUCCESS" ||
                    latestJob?.status === "QUEUED" ||
                    latestJob?.status === "RUNNING";

                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                              {
                                messages.enums.publishPlatformType[
                                  item.channelBinding.platformType
                                ]
                              }
                            </Badge>
                            <Badge className="rounded-full bg-[#fcfaf5] text-muted-foreground dark:bg-white/10 dark:text-white/70">
                              {latestJob
                                ? messages.enums.publishJobStatus[latestJob.status]
                                : messages.publishDraftDetail.notStartedStatus}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {item.channelBinding.displayName}
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {item.channelBinding.accountIdentifier ??
                              messages.publishDraftDetail.noAccountIdentifier}
                          </p>
                          {latestJob?.errorMessage ? (
                            <p className="text-sm leading-6 text-red-600 dark:text-red-200">
                              {latestJob.errorMessage}
                            </p>
                          ) : null}
                          {latestJob?.remotePostUrl ? (
                            <Link
                              href={latestJob.remotePostUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                            >
                              <ExternalLink className="mr-1.5 size-3.5" />
                              {messages.publishDraftDetail.openPublishedPost}
                            </Link>
                          ) : null}
                        </div>

                        <form action={executeFormAction}>
                          <input type="hidden" name="draftId" value={draft.id} />
                          <input
                            type="hidden"
                            name="channelBindingId"
                            value={item.channelBinding.id}
                          />
                          <Button
                            type="submit"
                            disabled={actionDisabled}
                            variant="outline"
                            className="h-10 rounded-full border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
                          >
                            {latestJob?.status === "RUNNING" ||
                            latestJob?.status === "QUEUED"
                              ? messages.publishDraftDetail.publishPending
                              : latestJob?.status === "SUCCESS"
                                ? messages.enums.publishJobStatus.SUCCESS
                                : actionLabel}
                          </Button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState
              title={messages.publishDraftDetail.noTargetChannelsTitle}
              description={messages.publishDraftDetail.noTargetChannelsDescription}
            />
          )}

          <ActionFeedback
            error={actionState.error}
            success={actionState.success}
          />
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
        <CardHeader>
          <CardTitle className="text-2xl">
            {messages.publishDraftDetail.historyTitle}
          </CardTitle>
          <CardDescription className="leading-6">
            {messages.publishDraftDetail.historyDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {draft.publishJobs.length > 0 ? (
            draft.publishJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                    {
                      messages.enums.publishPlatformType[
                        job.channelBinding.platformType
                      ]
                    }
                  </Badge>
                  <Badge className="rounded-full bg-[#fcfaf5] text-muted-foreground dark:bg-white/10 dark:text-white/70">
                    {messages.enums.publishJobStatus[job.status]}
                  </Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {job.channelBinding.displayName}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {job.channelBinding.accountIdentifier ??
                    messages.publishDraftDetail.noAccountIdentifier}
                </p>
                {job.errorMessage ? (
                  <p className="mt-3 text-sm leading-6 text-red-600 dark:text-red-200">
                    {job.errorMessage}
                  </p>
                ) : null}
                {job.remotePostUrl ? (
                  <div className="mt-4">
                    <Link
                      href={job.remotePostUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                    >
                      <ExternalLink className="mr-1.5 size-3.5" />
                      {messages.publishDraftDetail.openPublishedPost}
                    </Link>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <EmptyState
              title={messages.publishDraftDetail.emptyJobsTitle}
              description={messages.publishDraftDetail.emptyJobsDescription}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
