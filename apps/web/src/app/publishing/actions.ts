"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
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

  let draft: Pick<PublishDraftDetailRecord, "id">;

  try {
    draft = await apiRequest<Pick<PublishDraftDetailRecord, "id">>({
      path: "/publishing/drafts",
      method: "POST",
      body: JSON.stringify({
        reportId: parsed.data.reportId,
      }),
    });
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.publishing.publishDraftValidationFailed,
      ),
    } satisfies PublishDraftActionState;
  }

  revalidatePath("/reports");
  revalidatePath(`/reports/${parsed.data.reportId}`);
  revalidatePath(`/publishing/drafts/${draft.id}`);
  redirect(`/publishing/drafts/${draft.id}`);
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

  let draft: Pick<PublishDraftDetailRecord, "id">;

  try {
    draft = await apiRequest<Pick<PublishDraftDetailRecord, "id">>({
      path: "/publishing/drafts",
      method: "POST",
      body: JSON.stringify({
        archivedPostIds: [parsed.data.archiveId],
      }),
    });
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.publishing.publishDraftValidationFailed,
      ),
    } satisfies PublishDraftActionState;
  }

  revalidatePath("/archives");
  revalidatePath(`/archives/${parsed.data.archiveId}`);
  revalidatePath(`/publishing/drafts/${draft.id}`);
  redirect(`/publishing/drafts/${draft.id}`);
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

export async function executePublishDraftAction(
  _previousState: PublishDraftActionState,
  formData: FormData,
): Promise<PublishDraftActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    draftId: z
      .string()
      .trim()
      .min(1, messages.actions.publishing.missingPublishDraftId),
    channelBindingId: z.string().trim().optional(),
  });
  const parsed = schema.safeParse({
    draftId: getOptionalTextValue(formData, "draftId"),
    channelBindingId: getOptionalTextValue(formData, "channelBindingId"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.publishing.publishDraftExecutionFailed,
    } satisfies PublishDraftActionState;
  }

  try {
    const result = await apiRequest<{
      executedChannelCount: number;
    }>({
      path: `/publishing/drafts/${parsed.data.draftId}/publish`,
      method: "POST",
      body: JSON.stringify({
        ...(parsed.data.channelBindingId
          ? { channelBindingId: parsed.data.channelBindingId }
          : {}),
      }),
    });

    revalidatePath("/publishing");
    revalidatePath(`/publishing/drafts/${parsed.data.draftId}`);
    revalidatePath("/bindings");
    revalidatePath("/reports");

    return {
      success: formatMessage(
        messages.actions.publishing.publishDraftExecuted,
        {
          count: result.executedChannelCount,
        },
      ),
    } satisfies PublishDraftActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.publishing.publishDraftExecutionFailed,
      ),
    } satisfies PublishDraftActionState;
  }
}

export async function rewritePublishDraftAction(
  _previousState: PublishDraftActionState,
  formData: FormData,
): Promise<PublishDraftActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    draftId: z
      .string()
      .trim()
      .min(1, messages.actions.publishing.missingPublishDraftId),
    modelConfigId: z.string().trim().optional(),
    stylePreset: z.string().trim().optional(),
    tonePreset: z.string().trim().optional(),
    structurePreset: z.string().trim().optional(),
    lengthPreset: z.string().trim().optional(),
    platformStyle: z.string().trim().optional(),
    leadStyle: z.string().trim().optional(),
    endingStyle: z.string().trim().optional(),
    audience: z.string().trim().optional(),
    coreMessage: z.string().trim().optional(),
    readerTakeaway: z.string().trim().optional(),
    avoidPhrases: z.string().trim().optional(),
    customInstructions: z.string().trim().optional(),
    includeSourceLinks: z.boolean(),
    preserveMediaReferences: z.boolean(),
  });
  const parsed = schema.safeParse({
    draftId: getOptionalTextValue(formData, "draftId"),
    modelConfigId: getOptionalTextValue(formData, "modelConfigId"),
    stylePreset: getOptionalTextValue(formData, "stylePreset"),
    tonePreset: getOptionalTextValue(formData, "tonePreset"),
    structurePreset: getOptionalTextValue(formData, "structurePreset"),
    lengthPreset: getOptionalTextValue(formData, "lengthPreset"),
    platformStyle: getOptionalTextValue(formData, "platformStyle"),
    leadStyle: getOptionalTextValue(formData, "leadStyle"),
    endingStyle: getOptionalTextValue(formData, "endingStyle"),
    audience: getOptionalTextValue(formData, "audience"),
    coreMessage: getOptionalTextValue(formData, "coreMessage"),
    readerTakeaway: getOptionalTextValue(formData, "readerTakeaway"),
    avoidPhrases: getOptionalTextValue(formData, "avoidPhrases"),
    customInstructions: getOptionalTextValue(formData, "customInstructions"),
    includeSourceLinks: formData.get("includeSourceLinks") === "on",
    preserveMediaReferences: formData.get("preserveMediaReferences") === "on",
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.publishing.publishDraftRewriteFailed,
    } satisfies PublishDraftActionState;
  }

  try {
    await apiRequest({
      path: `/publishing/drafts/${parsed.data.draftId}/rewrite`,
      method: "POST",
      body: JSON.stringify({
        ...(parsed.data.modelConfigId
          ? { modelConfigId: parsed.data.modelConfigId }
          : {}),
        ...(parsed.data.stylePreset ? { stylePreset: parsed.data.stylePreset } : {}),
        ...(parsed.data.tonePreset ? { tonePreset: parsed.data.tonePreset } : {}),
        ...(parsed.data.structurePreset
          ? { structurePreset: parsed.data.structurePreset }
          : {}),
        ...(parsed.data.lengthPreset
          ? { lengthPreset: parsed.data.lengthPreset }
          : {}),
        ...(parsed.data.platformStyle
          ? { platformStyle: parsed.data.platformStyle }
          : {}),
        ...(parsed.data.leadStyle ? { leadStyle: parsed.data.leadStyle } : {}),
        ...(parsed.data.endingStyle
          ? { endingStyle: parsed.data.endingStyle }
          : {}),
        ...(parsed.data.audience ? { audience: parsed.data.audience } : {}),
        ...(parsed.data.coreMessage
          ? { coreMessage: parsed.data.coreMessage }
          : {}),
        ...(parsed.data.readerTakeaway
          ? { readerTakeaway: parsed.data.readerTakeaway }
          : {}),
        ...(parsed.data.avoidPhrases
          ? { avoidPhrases: parsed.data.avoidPhrases }
          : {}),
        ...(parsed.data.customInstructions
          ? { customInstructions: parsed.data.customInstructions }
          : {}),
        includeSourceLinks: parsed.data.includeSourceLinks,
        preserveMediaReferences: parsed.data.preserveMediaReferences,
      }),
    });

    revalidatePath("/publishing");
    revalidatePath(`/publishing/drafts/${parsed.data.draftId}`);
    revalidatePath("/reports");

    return {
      success: messages.actions.publishing.publishDraftRewritten,
    } satisfies PublishDraftActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.publishing.publishDraftRewriteFailed,
      ),
    } satisfies PublishDraftActionState;
  }
}
