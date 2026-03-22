"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirect } from "next/navigation";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";
import { normalizeDateRangeForApi } from "./report-utils";
import type { ReportDetailRecord } from "./report-types";

export type ReportActionState = {
  error?: string;
  success?: string;
};

function getOptionalTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

function getStringArrayValue(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export async function generateReportAction(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const { messages } = await getRequestMessages();
  const schema = z
    .object({
      reportType: z.enum(["WEEKLY", "MONTHLY"], {
        message: messages.actions.reports.missingReportType,
      }),
      periodStartDate: z
        .string()
        .trim()
        .min(1, messages.actions.reports.missingPeriodStart),
      periodEndDate: z
        .string()
        .trim()
        .min(1, messages.actions.reports.missingPeriodEnd),
      bindingIds: z.array(z.string().trim()),
      categoryIds: z.array(z.string().trim()),
      tagIds: z.array(z.string().trim()),
      modes: z.array(z.enum(["RECOMMENDED", "HOT", "SEARCH"])),
    })
    .superRefine((value, context) => {
      if (new Date(value.periodEndDate) < new Date(value.periodStartDate)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["periodEndDate"],
          message: messages.actions.reports.invalidPeriodRange,
        });
      }
    });

  const parsed = schema.safeParse({
    reportType: getOptionalTextValue(formData, "reportType"),
    periodStartDate: getOptionalTextValue(formData, "periodStartDate"),
    periodEndDate: getOptionalTextValue(formData, "periodEndDate"),
    bindingIds: getStringArrayValue(formData, "bindingIds"),
    categoryIds: getStringArrayValue(formData, "categoryIds"),
    tagIds: getStringArrayValue(formData, "tagIds"),
    modes: getStringArrayValue(formData, "modes"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.reports.generateValidationFailed,
    } satisfies ReportActionState;
  }

  let report: ReportDetailRecord;

  try {
    const { periodStart, periodEnd } = normalizeDateRangeForApi(
      parsed.data.periodStartDate,
      parsed.data.periodEndDate,
    );
    report = await apiRequest<ReportDetailRecord>({
      path: "/reports/generate",
      method: "POST",
      body: JSON.stringify({
        reportType: parsed.data.reportType,
        periodStart,
        periodEnd,
        bindingIds: parsed.data.bindingIds,
        categoryIds: parsed.data.categoryIds,
        tagIds: parsed.data.tagIds,
        modes: parsed.data.modes,
      }),
    });
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.reports.generateValidationFailed,
      ),
    } satisfies ReportActionState;
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${report.id}`);
  redirect(`/reports/${report.id}`);
}

export async function updateReportAction(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    reportId: z.string().trim().min(1, messages.actions.reports.missingReportId),
    title: z.string().trim().min(1, messages.actions.reports.missingReportTitle),
    bodyText: z.string().trim().min(1, messages.actions.reports.missingBodyText),
  });
  const parsed = schema.safeParse({
    reportId: getOptionalTextValue(formData, "reportId"),
    title: getOptionalTextValue(formData, "title"),
    bodyText: getOptionalTextValue(formData, "bodyText"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.reports.updateValidationFailed,
    } satisfies ReportActionState;
  }

  try {
    await apiRequest({
      path: `/reports/${parsed.data.reportId}`,
      method: "PATCH",
      body: JSON.stringify({
        title: parsed.data.title,
        bodyText: parsed.data.bodyText,
      }),
    });

    revalidatePath("/reports");
    revalidatePath(`/reports/${parsed.data.reportId}`);

    return {
      success: messages.actions.reports.reportUpdated,
    } satisfies ReportActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.reports.updateValidationFailed,
      ),
    } satisfies ReportActionState;
  }
}

export async function regenerateReportAction(
  _previousState: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    reportId: z.string().trim().min(1, messages.actions.reports.missingReportId),
  });
  const parsed = schema.safeParse({
    reportId: getOptionalTextValue(formData, "reportId"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.reports.regenerateValidationFailed,
    } satisfies ReportActionState;
  }

  try {
    await apiRequest({
      path: `/reports/${parsed.data.reportId}/regenerate`,
      method: "POST",
      body: JSON.stringify({}),
    });

    revalidatePath("/reports");
    revalidatePath(`/reports/${parsed.data.reportId}`);

    return {
      success: messages.actions.reports.reportRegenerated,
    } satisfies ReportActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.reports.regenerateValidationFailed,
      ),
    } satisfies ReportActionState;
  }
}
