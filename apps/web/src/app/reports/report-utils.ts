import { formatMessage, getIntlLocale, type Locale } from "@/lib/i18n";
import type { ReportDetailRecord } from "./report-types";

export type ReportsListFilters = {
  reportType?: string;
  status?: string;
};

export function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function getSingleQueryValue(
  value: string | string[] | undefined,
) {
  return Array.isArray(value) ? value[0] : value;
}

export function buildReportsQueryString(
  filters: Record<string, string | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (!value) {
      continue;
    }

    searchParams.set(key, value);
  }

  return searchParams.toString();
}

export function formatReportDate(
  value: string | Date,
  locale: Locale,
) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
  }).format(date);
}

export function getInclusivePeriodEnd(value: string | Date) {
  const endDate = value instanceof Date ? new Date(value) : new Date(value);
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  return endDate;
}

export function formatReportPeriod(
  periodStart: string | Date,
  periodEnd: string | Date,
  locale: Locale,
) {
  const startLabel = formatReportDate(periodStart, locale);
  const endLabel = formatReportDate(getInclusivePeriodEnd(periodEnd), locale);

  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

export function extractReportSummary(
  summaryJson: unknown,
  fallback: string,
) {
  if (
    !summaryJson ||
    typeof summaryJson !== "object" ||
    Array.isArray(summaryJson)
  ) {
    return fallback;
  }

  const summaryRecord = summaryJson as {
    summary?: unknown;
    overview?: unknown;
  };
  const summary =
    typeof summaryRecord.summary === "string"
      ? summaryRecord.summary.trim()
      : typeof summaryRecord.overview === "string"
        ? summaryRecord.overview.trim()
        : "";

  return summary.length > 0 ? summary : fallback;
}

export function extractReportBodyText(richTextJson: unknown) {
  if (
    !richTextJson ||
    typeof richTextJson !== "object" ||
    Array.isArray(richTextJson)
  ) {
    return "";
  }

  const blocks =
    "blocks" in richTextJson && Array.isArray(richTextJson.blocks)
      ? richTextJson.blocks
      : [];

  const paragraphs = blocks
    .map((block: unknown) => {
      if (
        !block ||
        typeof block !== "object" ||
        !("type" in block) ||
        block.type !== "paragraph" ||
        !("children" in block) ||
        !Array.isArray(block.children)
      ) {
        return null;
      }

      return block.children
        .map((node: unknown) => {
          if (
            !node ||
            typeof node !== "object" ||
            !("text" in node) ||
            typeof node.text !== "string"
          ) {
            return "";
          }

          return node.text;
        })
        .join("");
    })
    .filter((value): value is string => value !== null);

  return paragraphs.join("\n\n");
}

export function buildDefaultReportDates(reportType: "WEEKLY" | "MONTHLY") {
  const today = new Date();
  const endDate = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    ),
  );
  const startDate = new Date(endDate);

  startDate.setUTCDate(
    startDate.getUTCDate() - (reportType === "WEEKLY" ? 7 : 30),
  );

  return {
    start: startDate.toISOString().slice(0, 10),
    end: new Date(endDate.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  };
}

export function normalizeDateRangeForApi(
  periodStartDate: string,
  periodEndDate: string,
) {
  const startDate = new Date(`${periodStartDate}T00:00:00.000Z`);
  const endDate = new Date(`${periodEndDate}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  return {
    periodStart: startDate.toISOString(),
    periodEnd: endDate.toISOString(),
  };
}

export function buildReportTitleBadge(
  report: Pick<ReportDetailRecord, "reportType" | "status">,
  messages: {
    enums: {
      reportType: Record<"WEEKLY" | "MONTHLY", string>;
      reportStatus: Record<"DRAFT" | "READY" | "FAILED", string>;
    };
  },
) {
  return `${messages.enums.reportType[report.reportType]} · ${
    messages.enums.reportStatus[report.status]
  }`;
}
