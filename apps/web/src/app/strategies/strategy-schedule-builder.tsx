"use client";

import { useEffect, useMemo, useState } from "react";
import {
  describeSchedule,
  parseScheduleFormValue,
  serializeScheduleFormValue,
  type CrawlScheduleKind,
  type ScheduleSummaryMessages,
  type WeekdayValue,
} from "@/lib/crawl-schedule";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type StrategyScheduleBuilderMessages = ScheduleSummaryMessages & {
  customCronHint: string;
  customCronLabel: string;
  dailyTimeLabel: string;
  hourlyEveryHoursLabel: string;
  hourlyMinuteLabel: string;
  intervalMinutesLabel: string;
  schedulePresetCustom: string;
  schedulePresetDaily: string;
  schedulePresetHourly: string;
  schedulePresetInterval: string;
  schedulePresetLabel: string;
  schedulePresetWeekly: string;
  schedulePreviewLabel: string;
  weeklyDaysLabel: string;
  weeklyTimeLabel: string;
};

type StrategyScheduleBuilderProps = {
  idPrefix: string;
  initialValue: {
    intervalMinutes: number;
    scheduleCron?: string | null;
    scheduleKind?: CrawlScheduleKind | null;
  };
  messages: StrategyScheduleBuilderMessages;
};

export function StrategyScheduleBuilder({
  idPrefix,
  initialValue,
  messages,
}: StrategyScheduleBuilderProps) {
  const [formValue, setFormValue] = useState(() =>
    parseScheduleFormValue(initialValue),
  );

  useEffect(() => {
    setFormValue(parseScheduleFormValue(initialValue));
  }, [
    initialValue.intervalMinutes,
    initialValue.scheduleCron,
    initialValue.scheduleKind,
  ]);

  const serialized = useMemo(
    () => serializeScheduleFormValue(formValue),
    [formValue],
  );
  const preview = useMemo(
    () =>
      describeSchedule(
        {
          intervalMinutes:
            serialized.scheduleKind === "INTERVAL"
              ? Number(serialized.intervalMinutes)
              : formValue.intervalMinutes,
          scheduleKind: serialized.scheduleKind,
          scheduleCron: serialized.scheduleCron,
        },
        messages,
      ),
    [formValue.intervalMinutes, messages, serialized],
  );

  function toggleWeekday(day: WeekdayValue) {
    setFormValue((current) => {
      const exists = current.weeklyDays.includes(day);

      return {
        ...current,
        weeklyDays: exists
          ? current.weeklyDays.filter((item) => item !== day)
          : ([...current.weeklyDays, day].sort(
              (left, right) => left - right,
            ) as WeekdayValue[]),
      };
    });
  }

  return (
    <div className="space-y-4 rounded-[1.5rem] border border-border/70 bg-[#f8faf8] p-4 dark:border-white/10 dark:bg-white/8">
      <input
        type="hidden"
        name="scheduleKind"
        value={serialized.scheduleKind}
      />
      <input
        type="hidden"
        name="scheduleCron"
        value={serialized.scheduleCron}
      />
      <input
        type="hidden"
        name="intervalMinutes"
        value={serialized.intervalMinutes}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {messages.schedulePresetLabel}
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ["INTERVAL", messages.schedulePresetInterval],
            ["HOURLY", messages.schedulePresetHourly],
            ["DAILY", messages.schedulePresetDaily],
            ["WEEKLY", messages.schedulePresetWeekly],
            ["CUSTOM", messages.schedulePresetCustom],
          ].map(([preset, label]) => {
            const active = formValue.preset === preset;

            return (
              <button
                key={preset}
                type="button"
                onClick={() =>
                  setFormValue((current) => ({
                    ...current,
                    preset: preset as typeof current.preset,
                  }))
                }
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]"
                    : "border border-border/70 bg-white text-foreground hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {formValue.preset === "INTERVAL" ? (
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor={`${idPrefix}-interval`}
          >
            {messages.intervalMinutesLabel}
          </label>
          <Input
            id={`${idPrefix}-interval`}
            type="number"
            min={5}
            max={1440}
            value={String(formValue.intervalMinutes)}
            onChange={(event) =>
              setFormValue((current) => ({
                ...current,
                intervalMinutes: Number(event.target.value || 60),
              }))
            }
            className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
          />
        </div>
      ) : null}

      {formValue.preset === "HOURLY" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor={`${idPrefix}-hourly-hours`}
            >
              {messages.hourlyEveryHoursLabel}
            </label>
            <Input
              id={`${idPrefix}-hourly-hours`}
              type="number"
              min={1}
              max={23}
              value={String(formValue.hourlyEveryHours)}
              onChange={(event) =>
                setFormValue((current) => ({
                  ...current,
                  hourlyEveryHours: Number(event.target.value || 1),
                }))
              }
              className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor={`${idPrefix}-hourly-minute`}
            >
              {messages.hourlyMinuteLabel}
            </label>
            <Input
              id={`${idPrefix}-hourly-minute`}
              type="number"
              min={0}
              max={59}
              value={String(formValue.hourlyMinute)}
              onChange={(event) =>
                setFormValue((current) => ({
                  ...current,
                  hourlyMinute: Number(event.target.value || 0),
                }))
              }
              className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
            />
          </div>
        </div>
      ) : null}

      {formValue.preset === "DAILY" ? (
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor={`${idPrefix}-daily-time`}
          >
            {messages.dailyTimeLabel}
          </label>
          <Input
            id={`${idPrefix}-daily-time`}
            type="time"
            value={formValue.dailyTime}
            onChange={(event) =>
              setFormValue((current) => ({
                ...current,
                dailyTime: event.target.value || "09:00",
              }))
            }
            className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
          />
        </div>
      ) : null}

      {formValue.preset === "WEEKLY" ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {messages.weeklyDaysLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["sun", 0],
                  ["mon", 1],
                  ["tue", 2],
                  ["wed", 3],
                  ["thu", 4],
                  ["fri", 5],
                  ["sat", 6],
                ] as const
              ).map(([key, day]) => {
                const active = formValue.weeklyDays.includes(day);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleWeekday(day)}
                    className={cn(
                      "inline-flex h-9 min-w-12 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-[#7f5a26] text-white dark:bg-[#f2c58c] dark:text-[#2c2114]"
                        : "border border-border/70 bg-white text-foreground hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14",
                    )}
                  >
                    {messages.weekdays[key]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor={`${idPrefix}-weekly-time`}
            >
              {messages.weeklyTimeLabel}
            </label>
            <Input
              id={`${idPrefix}-weekly-time`}
              type="time"
              value={formValue.weeklyTime}
              onChange={(event) =>
                setFormValue((current) => ({
                  ...current,
                  weeklyTime: event.target.value || "09:00",
                }))
              }
              className="h-11 rounded-2xl border-border/70 bg-white px-4 dark:border-white/10 dark:bg-white/10"
            />
          </div>
        </div>
      ) : null}

      {formValue.preset === "CUSTOM" ? (
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor={`${idPrefix}-custom-cron`}
          >
            {messages.customCronLabel}
          </label>
          <Input
            id={`${idPrefix}-custom-cron`}
            type="text"
            value={formValue.customCron}
            onChange={(event) =>
              setFormValue((current) => ({
                ...current,
                customCron: event.target.value,
              }))
            }
            className="h-11 rounded-2xl border-border/70 bg-white px-4 font-mono dark:border-white/10 dark:bg-white/10"
          />
          <p className="text-sm leading-6 text-muted-foreground">
            {messages.customCronHint}
          </p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/70 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {messages.schedulePreviewLabel}
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">{preview}</p>
      </div>
    </div>
  );
}
