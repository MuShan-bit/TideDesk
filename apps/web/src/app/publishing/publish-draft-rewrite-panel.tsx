"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { AiModelRecord } from "@/app/ai/ai-types";
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
  rewritePublishDraftAction,
} from "./actions";
import type { PublishDraftDetailRecord } from "./publish-draft-types";

const initialActionState: PublishDraftActionState = {};
const platformStyleValues = ["GENERAL", "WECHAT", "ZHIHU", "CSDN"] as const;
const stylePresetValues = [
  "CURATED_INSIGHT",
  "PRACTICAL_GUIDE",
  "TREND_COMMENTARY",
  "STORYTELLING",
  "WEEKLY_SELECTION",
] as const;
const tonePresetValues = [
  "PROFESSIONAL",
  "FRIENDLY",
  "SHARP",
  "CALM",
  "ENERGETIC",
] as const;
const structurePresetValues = [
  "OPENING_BODY_TAKEAWAYS",
  "NUMBERED_LIST",
  "QUESTION_ANSWER",
  "BULLET_DIGEST",
] as const;
const lengthPresetValues = ["SHORT", "MEDIUM", "LONG"] as const;
const leadStyleValues = ["DIRECT", "QUESTION", "SCENARIO", "HOT_TAKE"] as const;
const endingStyleValues = [
  "SUMMARY",
  "CALL_TO_ACTION",
  "QUESTION",
  "NEXT_STEP",
] as const;

type PlatformStyleValue = (typeof platformStyleValues)[number];
type StylePresetValue = (typeof stylePresetValues)[number];
type TonePresetValue = (typeof tonePresetValues)[number];
type StructurePresetValue = (typeof structurePresetValues)[number];
type LengthPresetValue = (typeof lengthPresetValues)[number];
type LeadStyleValue = (typeof leadStyleValues)[number];
type EndingStyleValue = (typeof endingStyleValues)[number];

type PublishDraftRewritePanelProps = {
  availableModels: AiModelRecord[];
  draft: PublishDraftDetailRecord;
  loadError?: string | null;
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

function inferPlatformStyle(
  draft: PublishDraftDetailRecord,
): PlatformStyleValue {
  const platformTypes = Array.from(
    new Set(draft.targetChannels.map((item) => item.channelBinding.platformType)),
  );

  if (platformTypes.length === 1) {
    return platformTypes[0];
  }

  return "GENERAL";
}

export function PublishDraftRewritePanel({
  availableModels,
  draft,
  loadError,
  locale,
}: PublishDraftRewritePanelProps) {
  const messages = getMessages(locale);
  const router = useRouter();
  const [rewriteState, rewriteFormAction, isRewriting] = useActionState(
    rewritePublishDraftAction,
    initialActionState,
  );
  const [selectedModelId, setSelectedModelId] = useState("");
  const [platformStyle, setPlatformStyle] = useState<PlatformStyleValue>(
    inferPlatformStyle(draft),
  );
  const [stylePreset, setStylePreset] =
    useState<StylePresetValue>("CURATED_INSIGHT");
  const [tonePreset, setTonePreset] = useState<TonePresetValue>("PROFESSIONAL");
  const [structurePreset, setStructurePreset] = useState<StructurePresetValue>(
    "OPENING_BODY_TAKEAWAYS",
  );
  const [lengthPreset, setLengthPreset] = useState<LengthPresetValue>("MEDIUM");
  const [leadStyle, setLeadStyle] = useState<LeadStyleValue>("DIRECT");
  const [endingStyle, setEndingStyle] = useState<EndingStyleValue>("SUMMARY");
  const [audience, setAudience] = useState("");
  const [coreMessage, setCoreMessage] = useState("");
  const [readerTakeaway, setReaderTakeaway] = useState("");
  const [avoidPhrases, setAvoidPhrases] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [includeSourceLinks, setIncludeSourceLinks] = useState(true);
  const [preserveMediaReferences, setPreserveMediaReferences] = useState(true);

  const rewriteMessages = messages.publishDraftDetail.rewriteAssistant;
  const sortedModels = useMemo(
    () =>
      [...availableModels].sort((left, right) => {
        if (left.isDefault !== right.isDefault) {
          return left.isDefault ? -1 : 1;
        }

        return left.displayName.localeCompare(right.displayName);
      }),
    [availableModels],
  );
  const hasConfiguredModels = sortedModels.length > 0;

  useEffect(() => {
    if (rewriteState.success) {
      router.refresh();
    }
  }, [rewriteState.success, router]);

  useEffect(() => {
    setPlatformStyle(inferPlatformStyle(draft));
  }, [draft.id, draft.targetChannels]);

  const previewItems = useMemo(() => {
    return [
      `${rewriteMessages.platformStyleLabel}: ${rewriteMessages.platformStyles[platformStyle]}`,
      `${rewriteMessages.stylePresetLabel}: ${rewriteMessages.stylePresets[stylePreset]}`,
      `${rewriteMessages.tonePresetLabel}: ${rewriteMessages.tonePresets[tonePreset]}`,
      `${rewriteMessages.structurePresetLabel}: ${rewriteMessages.structurePresets[structurePreset]}`,
      `${rewriteMessages.lengthPresetLabel}: ${rewriteMessages.lengthPresets[lengthPreset]}`,
      `${rewriteMessages.leadStyleLabel}: ${rewriteMessages.leadStyles[leadStyle]}`,
      `${rewriteMessages.endingStyleLabel}: ${rewriteMessages.endingStyles[endingStyle]}`,
      audience ? `${rewriteMessages.audienceLabel}: ${audience}` : null,
      coreMessage
        ? `${rewriteMessages.coreMessageLabel}: ${coreMessage}`
        : null,
      readerTakeaway
        ? `${rewriteMessages.readerTakeawayLabel}: ${readerTakeaway}`
        : null,
      avoidPhrases
        ? `${rewriteMessages.avoidPhrasesLabel}: ${avoidPhrases}`
        : null,
      customInstructions
        ? `${rewriteMessages.customInstructionsLabel}: ${customInstructions}`
        : null,
      `${rewriteMessages.includeSourceLinksLabel}: ${
        includeSourceLinks
          ? rewriteMessages.yesOption
          : rewriteMessages.noOption
      }`,
      `${rewriteMessages.preserveMediaReferencesLabel}: ${
        preserveMediaReferences
          ? rewriteMessages.yesOption
          : rewriteMessages.noOption
      }`,
    ].filter((item): item is string => item !== null);
  }, [
    audience,
    coreMessage,
    customInstructions,
    endingStyle,
    includeSourceLinks,
    leadStyle,
    lengthPreset,
    platformStyle,
    preserveMediaReferences,
    readerTakeaway,
    rewriteMessages.audienceLabel,
    rewriteMessages.coreMessageLabel,
    rewriteMessages.customInstructionsLabel,
    rewriteMessages.endingStyleLabel,
    rewriteMessages.endingStyles,
    rewriteMessages.includeSourceLinksLabel,
    rewriteMessages.leadStyleLabel,
    rewriteMessages.leadStyles,
    rewriteMessages.lengthPresetLabel,
    rewriteMessages.lengthPresets,
    rewriteMessages.preserveMediaReferencesLabel,
    rewriteMessages.platformStyleLabel,
    rewriteMessages.platformStyles,
    rewriteMessages.readerTakeawayLabel,
    rewriteMessages.structurePresetLabel,
    rewriteMessages.structurePresets,
    rewriteMessages.stylePresetLabel,
    rewriteMessages.stylePresets,
    rewriteMessages.tonePresetLabel,
    rewriteMessages.tonePresets,
    rewriteMessages.noOption,
    stylePreset,
    structurePreset,
    tonePreset,
    avoidPhrases,
    rewriteMessages.yesOption,
  ]);

  const inputClassName =
    "h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10";
  const textareaClassName =
    "min-h-28 w-full rounded-[1.5rem] border border-border/70 bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10";
  const selectClassName =
    "h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10";

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
            <Sparkles className="size-5" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">{rewriteMessages.title}</CardTitle>
            <CardDescription className="leading-6">
              {rewriteMessages.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-[1.5rem] border border-[#ead9b5] bg-[#fff8e8] px-4 py-3 text-sm leading-6 text-[#7f5a26] dark:border-[#5b4423] dark:bg-[#362814] dark:text-[#f2c58c]">
          {rewriteMessages.warning}
        </div>

        {!hasConfiguredModels && !loadError ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-[#fcfaf5] px-4 py-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/8">
            <p>{rewriteMessages.noModelsConfigured}</p>
            <Link
              href="/ai"
              className="mt-2 inline-flex text-sm font-medium text-[#2d4d3f] underline-offset-4 hover:underline dark:text-[#d8e2db]"
            >
              /ai
            </Link>
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
            {loadError}
          </div>
        ) : null}

        <form action={rewriteFormAction} className="space-y-5">
          <input type="hidden" name="draftId" value={draft.id} />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="rewrite-model">
              {rewriteMessages.modelLabel}
            </label>
            <select
              id="rewrite-model"
              name="modelConfigId"
              className={selectClassName}
              value={selectedModelId}
              onChange={(event) => setSelectedModelId(event.currentTarget.value)}
            >
              <option value="">{rewriteMessages.modelDefaultOption}</option>
              {sortedModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.displayName} · {model.provider.name}
                </option>
              ))}
            </select>
            <p className="text-xs leading-5 text-muted-foreground">
              {rewriteMessages.modelHint}
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
            <h3 className="text-base font-semibold text-foreground">
              {rewriteMessages.presetSectionTitle}
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {rewriteMessages.presetSectionDescription}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-platform-style">
                  {rewriteMessages.platformStyleLabel}
                </label>
                <select
                  id="rewrite-platform-style"
                  name="platformStyle"
                  className={selectClassName}
                  value={platformStyle}
                  onChange={(event) =>
                    setPlatformStyle(event.currentTarget.value as PlatformStyleValue)
                  }
                >
                  {platformStyleValues.map((value) => (
                    <option key={value} value={value}>
                      {rewriteMessages.platformStyles[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-style-preset">
                  {rewriteMessages.stylePresetLabel}
                </label>
                <select
                  id="rewrite-style-preset"
                  name="stylePreset"
                  className={selectClassName}
                  value={stylePreset}
                  onChange={(event) =>
                    setStylePreset(event.currentTarget.value as StylePresetValue)
                  }
                >
                  {stylePresetValues.map((value) => (
                    <option key={value} value={value}>
                      {rewriteMessages.stylePresets[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-tone-preset">
                  {rewriteMessages.tonePresetLabel}
                </label>
                <select
                  id="rewrite-tone-preset"
                  name="tonePreset"
                  className={selectClassName}
                  value={tonePreset}
                  onChange={(event) =>
                    setTonePreset(event.currentTarget.value as TonePresetValue)
                  }
                >
                  {tonePresetValues.map((value) => (
                    <option key={value} value={value}>
                      {rewriteMessages.tonePresets[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-structure-preset">
                  {rewriteMessages.structurePresetLabel}
                </label>
                <select
                  id="rewrite-structure-preset"
                  name="structurePreset"
                  className={selectClassName}
                  value={structurePreset}
                  onChange={(event) =>
                    setStructurePreset(
                      event.currentTarget.value as StructurePresetValue,
                    )
                  }
                >
                  {structurePresetValues.map((value) => (
                    <option key={value} value={value}>
                      {rewriteMessages.structurePresets[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-length-preset">
                  {rewriteMessages.lengthPresetLabel}
                </label>
                <select
                  id="rewrite-length-preset"
                  name="lengthPreset"
                  className={selectClassName}
                  value={lengthPreset}
                  onChange={(event) =>
                    setLengthPreset(event.currentTarget.value as LengthPresetValue)
                  }
                >
                  {lengthPresetValues.map((value) => (
                    <option key={value} value={value}>
                      {rewriteMessages.lengthPresets[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-lead-style">
                  {rewriteMessages.leadStyleLabel}
                </label>
                <select
                  id="rewrite-lead-style"
                  name="leadStyle"
                  className={selectClassName}
                  value={leadStyle}
                  onChange={(event) =>
                    setLeadStyle(event.currentTarget.value as LeadStyleValue)
                  }
                >
                  {leadStyleValues.map((value) => (
                    <option key={value} value={value}>
                      {rewriteMessages.leadStyles[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-ending-style">
                  {rewriteMessages.endingStyleLabel}
                </label>
                <select
                  id="rewrite-ending-style"
                  name="endingStyle"
                  className={selectClassName}
                  value={endingStyle}
                  onChange={(event) =>
                    setEndingStyle(event.currentTarget.value as EndingStyleValue)
                  }
                >
                  {endingStyleValues.map((value) => (
                    <option key={value} value={value}>
                      {rewriteMessages.endingStyles[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
            <h3 className="text-base font-semibold text-foreground">
              {rewriteMessages.questionSectionTitle}
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {rewriteMessages.questionSectionDescription}
            </p>
            <div className="mt-4 grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-audience">
                  {rewriteMessages.audienceLabel}
                </label>
                <Input
                  id="rewrite-audience"
                  name="audience"
                  className={inputClassName}
                  placeholder={rewriteMessages.audiencePlaceholder}
                  value={audience}
                  onChange={(event) => setAudience(event.currentTarget.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-core-message">
                  {rewriteMessages.coreMessageLabel}
                </label>
                <Input
                  id="rewrite-core-message"
                  name="coreMessage"
                  className={inputClassName}
                  placeholder={rewriteMessages.coreMessagePlaceholder}
                  value={coreMessage}
                  onChange={(event) => setCoreMessage(event.currentTarget.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-reader-takeaway">
                  {rewriteMessages.readerTakeawayLabel}
                </label>
                <Input
                  id="rewrite-reader-takeaway"
                  name="readerTakeaway"
                  className={inputClassName}
                  placeholder={rewriteMessages.readerTakeawayPlaceholder}
                  value={readerTakeaway}
                  onChange={(event) =>
                    setReaderTakeaway(event.currentTarget.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-avoid-phrases">
                  {rewriteMessages.avoidPhrasesLabel}
                </label>
                <Input
                  id="rewrite-avoid-phrases"
                  name="avoidPhrases"
                  className={inputClassName}
                  placeholder={rewriteMessages.avoidPhrasesPlaceholder}
                  value={avoidPhrases}
                  onChange={(event) => setAvoidPhrases(event.currentTarget.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="rewrite-custom-instructions">
                  {rewriteMessages.customInstructionsLabel}
                </label>
                <textarea
                  id="rewrite-custom-instructions"
                  name="customInstructions"
                  className={textareaClassName}
                  placeholder={rewriteMessages.customInstructionsPlaceholder}
                  value={customInstructions}
                  onChange={(event) =>
                    setCustomInstructions(event.currentTarget.value)
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
              <h3 className="text-base font-semibold text-foreground">
                {rewriteMessages.previewTitle}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {rewriteMessages.previewDescription}
              </p>
              <div className="mt-4 space-y-2 text-sm leading-6 text-foreground">
                {previewItems.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
              <div className="space-y-4">
                <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/10">
                  <input
                    type="checkbox"
                    name="includeSourceLinks"
                    checked={includeSourceLinks}
                    onChange={(event) =>
                      setIncludeSourceLinks(event.currentTarget.checked)
                    }
                    className="mt-1 size-4 rounded border-border/70 text-[#2d4d3f] focus:ring-[#2d4d3f] dark:border-white/10 dark:bg-white/10 dark:text-[#d8e2db]"
                  />
                  <span className="space-y-1">
                    <span className="block font-medium text-foreground">
                      {rewriteMessages.includeSourceLinksLabel}
                    </span>
                    <span className="block leading-6 text-muted-foreground">
                      {rewriteMessages.includeSourceLinksHint}
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/10">
                  <input
                    type="checkbox"
                    name="preserveMediaReferences"
                    checked={preserveMediaReferences}
                    onChange={(event) =>
                      setPreserveMediaReferences(event.currentTarget.checked)
                    }
                    className="mt-1 size-4 rounded border-border/70 text-[#2d4d3f] focus:ring-[#2d4d3f] dark:border-white/10 dark:bg-white/10 dark:text-[#d8e2db]"
                  />
                  <span className="space-y-1">
                    <span className="block font-medium text-foreground">
                      {rewriteMessages.preserveMediaReferencesLabel}
                    </span>
                    <span className="block leading-6 text-muted-foreground">
                      {rewriteMessages.preserveMediaReferencesHint}
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <ActionFeedback
            error={rewriteState.error}
            success={rewriteState.success}
          />

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="submit"
              disabled={isRewriting || (!hasConfiguredModels && !loadError)}
              className="h-11 rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            >
              {isRewriting
                ? rewriteMessages.submitting
                : rewriteMessages.submit}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
