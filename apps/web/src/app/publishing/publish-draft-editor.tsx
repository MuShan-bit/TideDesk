"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, X } from "lucide-react";
import type { PublishChannelBindingRecord } from "@/app/bindings/publish-channel-types";
import { extractReportBodyText } from "@/app/reports/report-utils";
import type { TagRecord } from "@/app/taxonomy/taxonomy-types";
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
import {
  type PublishDraftActionState,
  updatePublishDraftAction,
} from "./actions";
import type { PublishDraftDetailRecord } from "./publish-draft-types";

const initialActionState: PublishDraftActionState = {};

type PublishDraftEditorProps = {
  availableChannels: PublishChannelBindingRecord[];
  availableTags: TagRecord[];
  draft: PublishDraftDetailRecord;
  editorOptionsError?: string | null;
  locale: Locale;
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

export function PublishDraftEditor({
  availableChannels,
  availableTags,
  draft,
  editorOptionsError,
  locale,
}: PublishDraftEditorProps) {
  const messages = getMessages(locale);
  const router = useRouter();
  const [updateState, updateFormAction, isUpdating] = useActionState(
    updatePublishDraftAction,
    initialActionState,
  );
  const [tagSearchKeyword, setTagSearchKeyword] = useState("");
  const [channelSearchKeyword, setChannelSearchKeyword] = useState("");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [channelPickerOpen, setChannelPickerOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState(
    draft.tagAssignments.map((item) => item.tag.id),
  );
  const [selectedChannelIds, setSelectedChannelIds] = useState(
    draft.targetChannels.map((item) => item.channelBinding.id),
  );

  const mergedTags = useMemo(() => {
    const tagMap = new Map<string, TagRecord>();

    draft.tagAssignments.forEach((item) => tagMap.set(item.tag.id, item.tag));
    availableTags.forEach((item) => tagMap.set(item.id, item));

    return Array.from(tagMap.values());
  }, [availableTags, draft.tagAssignments]);

  const mergedChannels = useMemo(() => {
    const channelMap = new Map<string, PublishChannelBindingRecord>();

    draft.targetChannels.forEach((item) =>
      channelMap.set(item.channelBinding.id, item.channelBinding),
    );
    availableChannels.forEach((item) => channelMap.set(item.id, item));

    return Array.from(channelMap.values());
  }, [availableChannels, draft.targetChannels]);

  const selectedTags = useMemo(
    () => mergedTags.filter((item) => selectedTagIds.includes(item.id)),
    [mergedTags, selectedTagIds],
  );
  const filteredTags = useMemo(() => {
    const keyword = tagSearchKeyword.trim().toLowerCase();

    if (!keyword) {
      return mergedTags;
    }

    return mergedTags.filter((item) =>
      [item.name, item.slug].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [mergedTags, tagSearchKeyword]);
  const selectedChannels = useMemo(
    () => mergedChannels.filter((item) => selectedChannelIds.includes(item.id)),
    [mergedChannels, selectedChannelIds],
  );
  const filteredChannels = useMemo(() => {
    const keyword = channelSearchKeyword.trim().toLowerCase();

    if (!keyword) {
      return mergedChannels;
    }

    return mergedChannels.filter((item) =>
      [item.displayName, item.accountIdentifier ?? "", item.platformType]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [channelSearchKeyword, mergedChannels]);

  useEffect(() => {
    if (updateState.success) {
      router.refresh();
    }
  }, [router, updateState.success]);

  useEffect(() => {
    setSelectedTagIds(draft.tagAssignments.map((item) => item.tag.id));
    setSelectedChannelIds(draft.targetChannels.map((item) => item.channelBinding.id));
  }, [draft.id, draft.tagAssignments, draft.targetChannels]);

  function toggleTagSelection(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((item) => item !== tagId)
        : [...current, tagId],
    );
  }

  function toggleChannelSelection(channelId: string) {
    setSelectedChannelIds((current) =>
      current.includes(channelId)
        ? current.filter((item) => item !== channelId)
        : [...current, channelId],
    );
  }

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
      <CardHeader>
        <CardTitle className="text-2xl">
          {messages.publishDraftDetail.editorTitle}
        </CardTitle>
        <CardDescription className="leading-6">
          {messages.publishDraftDetail.editorDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={updateFormAction} className="space-y-5">
          <input type="hidden" name="draftId" value={draft.id} />
          {selectedTagIds.map((tagId) => (
            <input key={tagId} type="hidden" name="tagIds" value={tagId} />
          ))}
          {selectedChannelIds.map((channelId) => (
            <input
              key={channelId}
              type="hidden"
              name="targetChannelIds"
              value={channelId}
            />
          ))}

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="publish-draft-title"
            >
              {messages.publishDraftDetail.titleLabel}
            </label>
            <Input
              id="publish-draft-title"
              name="title"
              defaultValue={draft.title}
              className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="publish-draft-summary"
            >
              {messages.publishDraftDetail.summaryLabel}
            </label>
            <textarea
              id="publish-draft-summary"
              name="summary"
              defaultValue={draft.summary ?? ""}
              className="min-h-32 w-full rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
              placeholder={messages.publishDraftDetail.summaryPlaceholder}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="publish-draft-body"
            >
              {messages.publishDraftDetail.bodyLabel}
            </label>
            <textarea
              id="publish-draft-body"
              name="bodyText"
              defaultValue={extractReportBodyText(draft.richTextJson)}
              className="min-h-72 w-full rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
              placeholder={messages.publishDraftDetail.bodyPlaceholder}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              {messages.publishDraftDetail.bodyHint}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {messages.publishDraftDetail.tagsLabel}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {messages.publishDraftDetail.tagsHint}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                onClick={() => setTagPickerOpen((current) => !current)}
              >
                <span>
                  {selectedTags.length > 0
                    ? messages.publishDraftDetail.selectedTagsCount.replace(
                        "{count}",
                        String(selectedTags.length),
                      )
                    : messages.publishDraftDetail.chooseTags}
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${
                    tagPickerOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {selectedTags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white px-3 py-1.5 text-xs font-medium text-foreground dark:border-white/10 dark:bg-white/10"
                    onClick={() => toggleTagSelection(tag.id)}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: tag.color ?? "#94a3b8" }}
                    />
                    {tag.name}
                    <X className="size-3" />
                  </button>
                ))}
              </div>
            ) : null}

            {tagPickerOpen ? (
              <div className="mt-4 space-y-3 rounded-[1.5rem] border border-border/70 bg-white/80 p-4 dark:border-white/10 dark:bg-black/10">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={tagSearchKeyword}
                    onChange={(event) => setTagSearchKeyword(event.currentTarget.value)}
                    className="h-10 rounded-2xl border-border/70 bg-white pl-9 dark:border-white/10 dark:bg-white/10"
                    placeholder={messages.publishDraftDetail.searchTagsPlaceholder}
                  />
                </div>
                {filteredTags.length > 0 ? (
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {filteredTags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition-colors ${
                            isSelected
                              ? "border-[#2d4d3f] bg-[#eef4f0] text-[#20372d] dark:border-[#d8e2db] dark:bg-[#223228] dark:text-[#d8e2db]"
                              : "border-border/70 bg-white text-foreground hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                          }`}
                          onClick={() => toggleTagSelection(tag.id)}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: tag.color ?? "#94a3b8" }}
                            />
                            <span>{tag.name}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {tag.slug}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {messages.publishDraftDetail.noMatchingTags}
                  </p>
                )}
              </div>
            ) : null}

            {mergedTags.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {messages.publishDraftDetail.noTagOptions}
              </p>
            ) : null}
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  {messages.publishDraftDetail.targetChannelsLabel}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {messages.publishDraftDetail.targetChannelsHint}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                onClick={() => setChannelPickerOpen((current) => !current)}
              >
                <span>
                  {selectedChannels.length > 0
                    ? messages.publishDraftDetail.selectedChannelsCount.replace(
                        "{count}",
                        String(selectedChannels.length),
                      )
                    : messages.publishDraftDetail.chooseChannels}
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${
                    channelPickerOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {selectedChannels.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedChannels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-white px-3 py-1.5 text-xs font-medium text-foreground dark:border-white/10 dark:bg-white/10"
                    onClick={() => toggleChannelSelection(channel.id)}
                  >
                    {messages.enums.publishPlatformType[channel.platformType]}
                    <span className="text-muted-foreground">
                      {channel.displayName}
                    </span>
                    <X className="size-3" />
                  </button>
                ))}
              </div>
            ) : null}

            {channelPickerOpen ? (
              <div className="mt-4 space-y-3 rounded-[1.5rem] border border-border/70 bg-white/80 p-4 dark:border-white/10 dark:bg-black/10">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={channelSearchKeyword}
                    onChange={(event) =>
                      setChannelSearchKeyword(event.currentTarget.value)
                    }
                    className="h-10 rounded-2xl border-border/70 bg-white pl-9 dark:border-white/10 dark:bg-white/10"
                    placeholder={messages.publishDraftDetail.searchChannelsPlaceholder}
                  />
                </div>
                {filteredChannels.length > 0 ? (
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {filteredChannels.map((channel) => {
                      const isSelected = selectedChannelIds.includes(channel.id);

                      return (
                        <button
                          key={channel.id}
                          type="button"
                          className={`flex w-full flex-col gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition-colors ${
                            isSelected
                              ? "border-[#2d4d3f] bg-[#eef4f0] text-[#20372d] dark:border-[#d8e2db] dark:bg-[#223228] dark:text-[#d8e2db]"
                              : "border-border/70 bg-white text-foreground hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                          }`}
                          onClick={() => toggleChannelSelection(channel.id)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">
                              {channel.displayName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {messages.enums.publishBindingStatus[channel.status]}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {messages.enums.publishPlatformType[channel.platformType]}
                            </span>
                            <span>
                              {channel.accountIdentifier ??
                                messages.publishDraftDetail.noAccountIdentifier}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {messages.publishDraftDetail.noMatchingChannels}
                  </p>
                )}
              </div>
            ) : null}

            {mergedChannels.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {messages.publishDraftDetail.noChannelOptions}
              </p>
            ) : null}
          </div>

          {editorOptionsError ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
              {editorOptionsError}
            </div>
          ) : null}

          <ActionFeedback
            error={updateState.error}
            success={updateState.success}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="submit"
              disabled={isUpdating}
              className="h-11 rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            >
              {isUpdating
                ? messages.publishDraftDetail.saving
                : messages.publishDraftDetail.save}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
