"use client";

import { useActionState, useEffect, useState } from "react";
import { generateReportAction, type ReportActionState } from "./actions";
import { buildDefaultReportDates } from "./report-utils";
import type { BindingRecord } from "@/app/bindings/binding-types";
import type { CategoryRecord, TagRecord } from "@/app/taxonomy/taxonomy-types";
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
import { getMessages, type Locale } from "@/lib/i18n";

const initialState: ReportActionState = {};

type ReportGenerateCardProps = {
  bindings: BindingRecord[];
  categories: CategoryRecord[];
  locale: Locale;
  tags: TagRecord[];
};

function ActionFeedback({
  error,
}: {
  error?: string;
}) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-200">
      {error}
    </div>
  );
}

export function ReportGenerateCard({
  bindings,
  categories,
  locale,
  tags,
}: ReportGenerateCardProps) {
  const messages = getMessages(locale);
  const [state, formAction, isPending] = useActionState(
    generateReportAction,
    initialState,
  );
  const [reportType, setReportType] = useState<"WEEKLY" | "MONTHLY">(
    "WEEKLY",
  );
  const [periodStartDate, setPeriodStartDate] = useState(
    buildDefaultReportDates("WEEKLY").start,
  );
  const [periodEndDate, setPeriodEndDate] = useState(
    buildDefaultReportDates("WEEKLY").end,
  );

  useEffect(() => {
    const defaults = buildDefaultReportDates(reportType);
    setPeriodStartDate(defaults.start);
    setPeriodEndDate(defaults.end);
  }, [reportType]);

  return (
    <Card
      id="report-generate"
      className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]"
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">
              {messages.reports.generateTitle}
            </CardTitle>
            <CardDescription className="mt-2 leading-6">
              {messages.reports.generateDescription}
            </CardDescription>
          </div>
          <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
            {messages.reports.generateBadge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={formAction} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="report-type"
              >
                {messages.reports.form.reportTypeLabel}
              </label>
              <select
                id="report-type"
                name="reportType"
                value={reportType}
                onChange={(event) =>
                  setReportType(event.target.value as "WEEKLY" | "MONTHLY")
                }
                className="h-11 w-full rounded-2xl border border-border/70 bg-white px-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/40 dark:border-white/10 dark:bg-white/10"
              >
                <option value="WEEKLY">
                  {messages.enums.reportType.WEEKLY}
                </option>
                <option value="MONTHLY">
                  {messages.enums.reportType.MONTHLY}
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="period-start-date"
              >
                {messages.reports.form.periodStartLabel}
              </label>
              <Input
                id="period-start-date"
                name="periodStartDate"
                type="date"
                value={periodStartDate}
                onChange={(event) => setPeriodStartDate(event.target.value)}
                className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="period-end-date"
              >
                {messages.reports.form.periodEndLabel}
              </label>
              <Input
                id="period-end-date"
                name="periodEndDate"
                type="date"
                value={periodEndDate}
                onChange={(event) => setPeriodEndDate(event.target.value)}
                className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
              />
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {messages.reports.filterTitle}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {messages.reports.filterDescription}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  {messages.reports.form.bindingFilterLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {bindings.length > 0 ? (
                    bindings.map((binding) => (
                      <label
                        key={binding.id}
                        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2 text-sm text-foreground dark:border-white/10 dark:bg-white/10"
                      >
                        <input
                          type="checkbox"
                          name="bindingIds"
                          value={binding.id}
                          className="size-4 rounded border-border/70 text-[#2d4d3f]"
                        />
                        @{binding.username}
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {messages.reports.noBindingsHint}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  {messages.reports.form.modeFilterLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["RECOMMENDED", "HOT", "SEARCH"] as const).map((mode) => (
                    <label
                      key={mode}
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2 text-sm text-foreground dark:border-white/10 dark:bg-white/10"
                    >
                      <input
                        type="checkbox"
                        name="modes"
                        value={mode}
                        className="size-4 rounded border-border/70 text-[#2d4d3f]"
                      />
                      {messages.enums.crawlMode[mode]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  {messages.reports.form.categoryFilterLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.length > 0 ? (
                    categories
                      .filter((category) => category.isActive)
                      .map((category) => (
                        <label
                          key={category.id}
                          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2 text-sm text-foreground dark:border-white/10 dark:bg-white/10"
                        >
                          <input
                            type="checkbox"
                            name="categoryIds"
                            value={category.id}
                            className="size-4 rounded border-border/70 text-[#2d4d3f]"
                          />
                          {category.name}
                        </label>
                      ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {messages.reports.noCategoriesHint}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  {messages.reports.form.tagFilterLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.length > 0 ? (
                    tags
                      .filter((tag) => tag.isActive)
                      .map((tag) => (
                        <label
                          key={tag.id}
                          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-3 py-2 text-sm text-foreground dark:border-white/10 dark:bg-white/10"
                        >
                          <input
                            type="checkbox"
                            name="tagIds"
                            value={tag.id}
                            className="size-4 rounded border-border/70 text-[#2d4d3f]"
                          />
                          {tag.name}
                        </label>
                      ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {messages.reports.noTagsHint}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <ActionFeedback error={state.error} />

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="submit"
              disabled={isPending}
              className="h-11 rounded-full bg-[#2d4d3f] px-5 text-white hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            >
              {isPending
                ? messages.reports.generating
                : messages.reports.generateAction}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
