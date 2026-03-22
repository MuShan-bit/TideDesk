"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";
import type { PublishDraftDetailRecord } from "./publish-draft-types";

export type PublishDraftActionState = {
  error?: string;
};

function getOptionalTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

export async function createPublishDraftFromReportAction(
  _previousState: PublishDraftActionState,
  formData: FormData,
): Promise<PublishDraftActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    reportId: z
      .string()
      .trim()
      .min(1, messages.actions.publishing.missingPublishDraftReportId),
  });
  const parsed = schema.safeParse({
    reportId: getOptionalTextValue(formData, "reportId"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.publishing.publishDraftValidationFailed,
    } satisfies PublishDraftActionState;
  }

  try {
    const draft = await apiRequest<Pick<PublishDraftDetailRecord, "id">>({
      path: "/publishing/drafts",
      method: "POST",
      body: JSON.stringify({
        reportId: parsed.data.reportId,
      }),
    });

    revalidatePath("/reports");
    revalidatePath(`/reports/${parsed.data.reportId}`);
    revalidatePath(`/publishing/drafts/${draft.id}`);
    redirect(`/publishing/drafts/${draft.id}`);
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.publishing.publishDraftValidationFailed,
      ),
    } satisfies PublishDraftActionState;
  }
}

export async function createPublishDraftFromArchiveAction(
  _previousState: PublishDraftActionState,
  formData: FormData,
): Promise<PublishDraftActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    archiveId: z
      .string()
      .trim()
      .min(1, messages.actions.publishing.missingPublishDraftArchiveId),
  });
  const parsed = schema.safeParse({
    archiveId: getOptionalTextValue(formData, "archiveId"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.publishing.publishDraftValidationFailed,
    } satisfies PublishDraftActionState;
  }

  try {
    const draft = await apiRequest<Pick<PublishDraftDetailRecord, "id">>({
      path: "/publishing/drafts",
      method: "POST",
      body: JSON.stringify({
        archivedPostIds: [parsed.data.archiveId],
      }),
    });

    revalidatePath("/archives");
    revalidatePath(`/archives/${parsed.data.archiveId}`);
    revalidatePath(`/publishing/drafts/${draft.id}`);
    redirect(`/publishing/drafts/${draft.id}`);
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.publishing.publishDraftValidationFailed,
      ),
    } satisfies PublishDraftActionState;
  }
}
