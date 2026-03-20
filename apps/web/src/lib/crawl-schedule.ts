import { formatMessage } from "@/lib/i18n";

export type CrawlScheduleKind = "INTERVAL" | "CRON";
export type SchedulePreset =
  | "INTERVAL"
  | "HOURLY"
  | "DAILY"
  | "WEEKLY"
  | "CUSTOM";
export type WeekdayValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ScheduleFormValue = {
  customCron: string;
  dailyTime: string;
  hourlyEveryHours: number;
  hourlyMinute: number;
  intervalMinutes: number;
  preset: SchedulePreset;
  scheduleCron: string;
  scheduleKind: CrawlScheduleKind;
  weeklyDays: WeekdayValue[];
  weeklyTime: string;
};

export type ScheduleSummaryMessages = {
  scheduleSummaryCustom: string;
  scheduleSummaryDaily: string;
  scheduleSummaryHourly: string;
  scheduleSummaryInterval: string;
  scheduleSummaryWeekly: string;
  weekdays: Record<
    "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat",
    string
  >;
};

const DEFAULT_FORM_VALUE: ScheduleFormValue = {
  preset: "INTERVAL",
  scheduleKind: "INTERVAL",
  scheduleCron: "",
  intervalMinutes: 60,
  hourlyEveryHours: 2,
  hourlyMinute: 0,
  dailyTime: "09:00",
  weeklyDays: [1, 3, 5],
  weeklyTime: "09:00",
  customCron: "0 9 * * 1-5",
};

const weekdayOrder: Array<{
  key: keyof ScheduleSummaryMessages["weekdays"];
  value: WeekdayValue;
}> = [
  { key: "sun", value: 0 },
  { key: "mon", value: 1 },
  { key: "tue", value: 2 },
  { key: "wed", value: 3 },
  { key: "thu", value: 4 },
  { key: "fri", value: 5 },
  { key: "sat", value: 6 },
];

export function parseScheduleFormValue(input: {
  intervalMinutes?: number | null;
  scheduleCron?: string | null;
  scheduleKind?: CrawlScheduleKind | null;
}): ScheduleFormValue {
  if (input.scheduleKind === "CRON" && input.scheduleCron?.trim()) {
    return parseCronSchedule(
      input.scheduleCron.trim(),
      input.intervalMinutes ?? 60,
    );
  }

  return {
    ...DEFAULT_FORM_VALUE,
    preset: "INTERVAL",
    scheduleKind: "INTERVAL",
    intervalMinutes: clampInteger(input.intervalMinutes ?? 60, 5, 1440),
    scheduleCron: "",
  };
}

export function serializeScheduleFormValue(value: ScheduleFormValue) {
  switch (value.preset) {
    case "INTERVAL":
      return {
        scheduleKind: "INTERVAL" as const,
        scheduleCron: "",
        intervalMinutes: String(clampInteger(value.intervalMinutes, 5, 1440)),
      };
    case "HOURLY": {
      const minute = clampInteger(value.hourlyMinute, 0, 59);
      const hours = clampInteger(value.hourlyEveryHours, 1, 23);

      return {
        scheduleKind: "CRON" as const,
        scheduleCron: `${minute} */${hours} * * *`,
        intervalMinutes: String(hours * 60),
      };
    }
    case "DAILY": {
      const { hour, minute } = parseTime(value.dailyTime, "09:00");

      return {
        scheduleKind: "CRON" as const,
        scheduleCron: `${minute} ${hour} * * *`,
        intervalMinutes: String(1440),
      };
    }
    case "WEEKLY": {
      const { hour, minute } = parseTime(value.weeklyTime, "09:00");
      const normalizedDays = normalizeWeekdays(value.weeklyDays);

      return {
        scheduleKind: "CRON" as const,
        scheduleCron: `${minute} ${hour} * * ${normalizedDays.join(",")}`,
        intervalMinutes: String(10080),
      };
    }
    case "CUSTOM":
    default:
      return {
        scheduleKind: "CRON" as const,
        scheduleCron: value.customCron.trim(),
        intervalMinutes: String(clampInteger(value.intervalMinutes, 5, 10080)),
      };
  }
}

export function describeSchedule(
  input: {
    intervalMinutes: number;
    scheduleCron?: string | null;
    scheduleKind?: CrawlScheduleKind | null;
  },
  messages: ScheduleSummaryMessages,
) {
  const value = parseScheduleFormValue(input);

  switch (value.preset) {
    case "INTERVAL":
      return formatMessage(messages.scheduleSummaryInterval, {
        minutes: value.intervalMinutes,
      });
    case "HOURLY":
      return formatMessage(messages.scheduleSummaryHourly, {
        hours: value.hourlyEveryHours,
        minute: padNumber(value.hourlyMinute),
      });
    case "DAILY":
      return formatMessage(messages.scheduleSummaryDaily, {
        time: value.dailyTime,
      });
    case "WEEKLY":
      return formatMessage(messages.scheduleSummaryWeekly, {
        days: value.weeklyDays
          .map(
            (day) =>
              messages.weekdays[
                weekdayOrder.find((item) => item.value === day)!.key
              ],
          )
          .join(" / "),
        time: value.weeklyTime,
      });
    case "CUSTOM":
    default:
      return formatMessage(messages.scheduleSummaryCustom, {
        expression: value.customCron.trim() || input.scheduleCron?.trim() || "",
      });
  }
}

function parseCronSchedule(
  expression: string,
  intervalMinutes: number,
): ScheduleFormValue {
  const weeklyMatch = expression.match(
    /^(\d{1,2}) (\d{1,2}) \* \* ([0-6](?:,[0-6])*)$/,
  );

  if (weeklyMatch) {
    return {
      ...DEFAULT_FORM_VALUE,
      preset: "WEEKLY",
      scheduleKind: "CRON",
      scheduleCron: expression,
      intervalMinutes: clampInteger(intervalMinutes, 5, 10080),
      weeklyDays: normalizeWeekdays(
        weeklyMatch[3].split(",").map((item) => Number(item) as WeekdayValue),
      ),
      weeklyTime: formatTime(Number(weeklyMatch[2]), Number(weeklyMatch[1])),
      customCron: expression,
    };
  }

  const dailyMatch = expression.match(/^(\d{1,2}) (\d{1,2}) \* \* \*$/);

  if (dailyMatch) {
    return {
      ...DEFAULT_FORM_VALUE,
      preset: "DAILY",
      scheduleKind: "CRON",
      scheduleCron: expression,
      intervalMinutes: clampInteger(intervalMinutes, 5, 10080),
      dailyTime: formatTime(Number(dailyMatch[2]), Number(dailyMatch[1])),
      customCron: expression,
    };
  }

  const hourlyMatch = expression.match(/^(\d{1,2}) \*\/(\d{1,2}) \* \* \*$/);

  if (hourlyMatch) {
    return {
      ...DEFAULT_FORM_VALUE,
      preset: "HOURLY",
      scheduleKind: "CRON",
      scheduleCron: expression,
      intervalMinutes: clampInteger(intervalMinutes, 5, 10080),
      hourlyMinute: clampInteger(Number(hourlyMatch[1]), 0, 59),
      hourlyEveryHours: clampInteger(Number(hourlyMatch[2]), 1, 23),
      customCron: expression,
    };
  }

  return {
    ...DEFAULT_FORM_VALUE,
    preset: "CUSTOM",
    scheduleKind: "CRON",
    scheduleCron: expression,
    intervalMinutes: clampInteger(intervalMinutes, 5, 10080),
    customCron: expression,
  };
}

function normalizeWeekdays(days: WeekdayValue[]) {
  return [...new Set(days)].sort(
    (left, right) => left - right,
  ) as WeekdayValue[];
}

function parseTime(value: string, fallback: string) {
  const match =
    value.match(/^(\d{2}):(\d{2})$/) ?? fallback.match(/^(\d{2}):(\d{2})$/);

  return {
    hour: clampInteger(Number(match?.[1] ?? 9), 0, 23),
    minute: clampInteger(Number(match?.[2] ?? 0), 0, 59),
  };
}

function formatTime(hour: number, minute: number) {
  return `${padNumber(clampInteger(hour, 0, 23))}:${padNumber(clampInteger(minute, 0, 59))}`;
}

function clampInteger(value: number, min: number, max: number) {
  const normalized = Number.isFinite(value) ? Math.round(value) : min;

  return Math.min(max, Math.max(min, normalized));
}

function padNumber(value: number) {
  return String(value).padStart(2, "0");
}
