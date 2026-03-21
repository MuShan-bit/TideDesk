"use client";

import { useActionState } from "react";
import {
  type ArchiveTaxonomyActionState,
  updateArchiveTaxonomyAction,
} from "../actions";
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

export type TaxonomyOption = {
  color: string | null;
  id: string;
  isActive: boolean;
  name: string;
};

export type ArchiveTagAssignment = {
  id: string;
  source: "MANUAL" | "AI" | "RULE";
  tag: TaxonomyOption;
};

type ArchiveTaxonomyEditorProps = {
  archiveId: string;
  categories: TaxonomyOption[];
  loadError?: string | null;
  locale: Locale;
  primaryCategory: TaxonomyOption | null;
  primaryCategoryLocked: boolean;
  tagAssignments: ArchiveTagAssignment[];
  tagAssignmentsLocked: boolean;
  tags: TaxonomyOption[];
};

const initialState: ArchiveTaxonomyActionState = {};

function renderTagChips(tags: TaxonomyOption[], emptyText: string) {
  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag.id}
          className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]"
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}

export function ArchiveTaxonomyEditor({
  archiveId,
  categories,
  loadError,
  locale,
  primaryCategory,
  primaryCategoryLocked,
  tagAssignments,
  tagAssignmentsLocked,
  tags,
}: ArchiveTaxonomyEditorProps) {
  const messages = getMessages(locale);
  const [state, formAction, isPending] = useActionState(
    updateArchiveTaxonomyAction,
    initialState,
  );
  const visibleTagAssignments = Array.from(
    new Map(
      tagAssignments.map((assignment) => [assignment.tag.id, assignment]),
    ).values(),
  );
  const currentTags = visibleTagAssignments.map((assignment) => assignment.tag);
  const currentTagIdSet = new Set(currentTags.map((tag) => tag.id));

  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
      <CardHeader className="gap-3">
        <CardTitle className="text-2xl">
          {messages.archiveDetail.taxonomyTitle}
        </CardTitle>
        <CardDescription className="leading-6">
          {messages.archiveDetail.taxonomyDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-4 rounded-3xl bg-[#fcfaf5] p-5 dark:bg-[#161b17]">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {messages.archiveDetail.currentCategoryLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {primaryCategory ? (
                <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                  {primaryCategory.name}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {messages.archiveDetail.noPrimaryCategory}
                </p>
              )}
              {primaryCategoryLocked ? (
                <Badge className="rounded-full border border-[#2d4d3f]/15 bg-[#f1f6f3] text-[#2d4d3f] dark:border-[#d8e2db]/20 dark:bg-[#1c2520] dark:text-[#d8e2db]">
                  {messages.archiveDetail.lockBadge}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {messages.archiveDetail.currentTagsLabel}
              </p>
              {tagAssignmentsLocked ? (
                <Badge className="rounded-full border border-[#2d4d3f]/15 bg-[#f1f6f3] text-[#2d4d3f] dark:border-[#d8e2db]/20 dark:bg-[#1c2520] dark:text-[#d8e2db]">
                  {messages.archiveDetail.lockBadge}
                </Badge>
              ) : null}
            </div>
            {renderTagChips(currentTags, messages.archiveDetail.noTags)}
          </div>
        </div>

        {loadError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
            {loadError}
          </div>
        ) : null}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="archiveId" value={archiveId} />

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="primaryCategoryId"
            >
              {messages.archiveDetail.primaryCategoryLabel}
            </label>
            <select
              id="primaryCategoryId"
              name="primaryCategoryId"
              defaultValue={primaryCategory?.id ?? ""}
              className="h-11 w-full rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 text-sm text-foreground outline-none transition-colors focus:border-[#2d4d3f] dark:border-white/10 dark:bg-white/8 dark:focus:border-[#d8e2db]"
            >
              <option value="">{messages.archiveDetail.chooseCategory}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {messages.archiveDetail.tagsFieldLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                {messages.archiveDetail.taxonomyEditorHint}
              </p>
            </div>
            {tags.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 text-sm text-foreground transition-colors hover:border-[#2d4d3f] dark:border-white/10 dark:bg-white/8 dark:hover:border-[#d8e2db]"
                  >
                    <input
                      className="size-4 rounded border-border/70 text-[#2d4d3f] focus:ring-[#2d4d3f] dark:border-white/20 dark:bg-white/10 dark:text-[#d8e2db]"
                      defaultChecked={currentTagIdSet.has(tag.id)}
                      name="tagIds"
                      type="checkbox"
                      value={tag.id}
                    />
                    <span className="flex-1">{tag.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-[#fcfaf5] px-4 py-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/8">
                {messages.archiveDetail.noTagOptions}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {messages.archiveDetail.taxonomyLockHint}
            </p>
          </div>

          {state.error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
              {state.error}
            </div>
          ) : null}
          {state.success ? (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100">
              {state.success}
            </div>
          ) : null}

          <Button
            className="h-11 rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            disabled={isPending || Boolean(loadError)}
            type="submit"
          >
            {isPending
              ? messages.archiveDetail.saveTaxonomyPending
              : messages.archiveDetail.saveTaxonomy}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
