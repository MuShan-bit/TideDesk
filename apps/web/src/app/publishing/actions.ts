"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";
import type { PublishDraftDetailRecord } from "./publish-draft-types";

export type PublishDraftActionState = {
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

export async function updatePublishDraftAction(
  _previousState: PublishDraftActionState,
  formData: FormData,
): Promise<PublishDraftActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    draftId: z
      .string()
      .trim()
      .min(1, messages.actions.publishing.missingPublishDraftId),
    title: z
      .string()
      .trim()
      .min(1, messages.actions.publishing.missingPublishDraftTitle),
    summary: z.string().trim(),
    bodyText: z.string().trim(),
    tagIds: z.array(z.string().trim()),
    targetChannelIds: z.array(z.string().trim()),
  });
  const parsed = schema.safeParse({
    draftId: getOptionalTextValue(formData, "draftId"),
    title: getOptionalTextValue(formData, "title"),
    summary: getOptionalTextValue(formData, "summary") ?? "",
    bodyText: getOptionalTextValue(formData, "bodyText") ?? "",
    tagIds: getStringArrayValue(formData, "tagIds"),
    targetChannelIds: getStringArrayValue(formData, "targetChannelIds"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.publishing.publishDraftUpdateFailed,
    } satisfies PublishDraftActionState;
  }

  try {
    await apiRequest({
      path: `/publishing/drafts/${parsed.data.draftId}`,
      method: "PATCH",
      body: JSON.stringify({
        title: parsed.data.title,
        summary: parsed.data.summary,
        bodyText: parsed.data.bodyText,
        tagIds: parsed.data.tagIds,
        targetChannelIds: parsed.data.targetChannelIds,
      }),
    });

    revalidatePath(`/publishing/drafts/${parsed.data.draftId}`);
    revalidatePath("/bindings");
    revalidatePath("/reports");
    revalidatePath("/archives");

    return {
      success: messages.actions.publishing.publishDraftUpdated,
    } satisfies PublishDraftActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.publishing.publishDraftUpdateFailed,
      ),
    } satisfies PublishDraftActionState;
  }
}
