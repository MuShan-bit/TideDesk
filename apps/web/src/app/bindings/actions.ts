"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formatMessage } from "@/lib/i18n";
import {
  ApiRequestError,
  apiRequest,
  getApiErrorMessage,
} from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";

export type BindingActionState = {
  actionHref?: string;
  actionLabel?: string;
  error?: string;
  success?: string;
};

type ManualCrawlRunResponse = {
  id: string;
  status: string;
  triggerType: string;
};

type UnbindBindingResponse = {
  deletedArchiveCount: number;
  deletedBindingId: string;
  deletedRunCount: number;
};

const credentialSourceSchema = z.enum([
  "WEB_LOGIN",
  "COOKIE_IMPORT",
  "EXTENSION",
]);
const crawlModeSchema = z.enum(["RECOMMENDED", "HOT", "SEARCH"]);
const crawlScheduleKindSchema = z.enum(["INTERVAL", "CRON"]);

function getOptionalTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

function createBindingSchema(
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  return z.object({
    xUserId: z.string().trim().min(1, messages.actions.bindings.missingXUserId),
    username: z
      .string()
      .trim()
      .min(1, messages.actions.bindings.missingUsername),
    displayName: z.string().trim().optional(),
    avatarUrl: z
      .union([
        z.string().trim().url(messages.actions.bindings.invalidAvatarUrl),
        z.literal(""),
      ])
      .optional()
      .transform((value) => value || undefined),
    credentialSource: credentialSourceSchema,
    credentialPayload: z
      .string()
      .trim()
      .min(1, messages.actions.bindings.missingCredentialPayload),
    crawlEnabled: z.boolean(),
    crawlIntervalMinutes: z.coerce
      .number({ error: messages.actions.bindings.missingCrawlInterval })
      .int(messages.actions.bindings.invalidCrawlIntervalInt)
      .min(5, messages.actions.bindings.invalidCrawlIntervalMin)
      .max(1440, messages.actions.bindings.invalidCrawlIntervalMax),
  });
}

function createCrawlConfigSchema(
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  return z.object({
    bindingId: z
      .string()
      .trim()
      .min(1, messages.actions.bindings.missingBindingId),
    crawlEnabled: z.boolean(),
    crawlIntervalMinutes: z.coerce
      .number({ error: messages.actions.bindings.missingCrawlInterval })
      .int(messages.actions.bindings.invalidCrawlIntervalInt)
      .min(5, messages.actions.bindings.invalidCrawlIntervalMin)
      .max(1440, messages.actions.bindings.invalidCrawlIntervalMax),
  });
}

function createBindingOperationSchema(
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  return z.object({
    bindingId: z
      .string()
      .trim()
      .min(1, messages.actions.bindings.missingBindingId),
  });
}

function createCrawlProfileSchema(
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  return z
    .object({
      bindingId: z
        .string()
        .trim()
        .min(1, messages.actions.bindings.missingBindingId),
      mode: crawlModeSchema,
      enabled: z.boolean(),
      scheduleKind: crawlScheduleKindSchema,
      scheduleCron: z
        .string()
        .trim()
        .optional()
        .transform((value) => value || undefined),
      intervalMinutes: z.coerce
        .number({ error: messages.actions.bindings.missingCrawlInterval })
        .int(messages.actions.bindings.invalidCrawlIntervalInt)
        .min(5, messages.actions.bindings.invalidCrawlIntervalMin),
      queryText: z.string().trim().optional(),
      maxPosts: z.coerce
        .number({ error: messages.actions.bindings.missingMaxPosts })
        .int(messages.actions.bindings.invalidMaxPostsInt)
        .min(1, messages.actions.bindings.invalidMaxPostsMin)
        .max(200, messages.actions.bindings.invalidMaxPostsMax),
    })
    .superRefine((value, context) => {
      if (value.mode === "SEARCH" && !value.queryText) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.actions.bindings.missingQueryText,
          path: ["queryText"],
        });
      }

      if (value.scheduleKind === "INTERVAL" && value.intervalMinutes > 1440) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.actions.bindings.invalidCrawlIntervalMax,
          path: ["intervalMinutes"],
        });
      }

      if (value.scheduleKind === "CRON" && !value.scheduleCron) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.actions.bindings.missingScheduleCron,
          path: ["scheduleCron"],
        });
      }
    });
}

function createCrawlProfileOperationSchema(
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  return z.object({
    bindingId: z
      .string()
      .trim()
      .min(1, messages.actions.bindings.missingBindingId),
    profileId: z
      .string()
      .trim()
      .min(1, messages.actions.bindings.missingProfileId),
  });
}

function createUpdateCrawlProfileSchema(
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  return z
    .object({
      mode: crawlModeSchema,
      enabled: z.boolean(),
      scheduleKind: crawlScheduleKindSchema,
      scheduleCron: z
        .string()
        .trim()
        .optional()
        .transform((value) => value || undefined),
      intervalMinutes: z.coerce
        .number({ error: messages.actions.bindings.missingCrawlInterval })
        .int(messages.actions.bindings.invalidCrawlIntervalInt)
        .min(5, messages.actions.bindings.invalidCrawlIntervalMin),
      queryText: z.string().trim().optional(),
      maxPosts: z.coerce
        .number({ error: messages.actions.bindings.missingMaxPosts })
        .int(messages.actions.bindings.invalidMaxPostsInt)
        .min(1, messages.actions.bindings.invalidMaxPostsMin)
        .max(200, messages.actions.bindings.invalidMaxPostsMax),
    })
    .superRefine((value, context) => {
      if (value.mode === "SEARCH" && !value.queryText) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.actions.bindings.missingQueryText,
          path: ["queryText"],
        });
      }

      if (value.scheduleKind === "INTERVAL" && value.intervalMinutes > 1440) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.actions.bindings.invalidCrawlIntervalMax,
          path: ["intervalMinutes"],
        });
      }

      if (value.scheduleKind === "CRON" && !value.scheduleCron) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.actions.bindings.missingScheduleCron,
          path: ["scheduleCron"],
        });
      }
    });
}

function buildManualCrawlErrorState(
  error: unknown,
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
): BindingActionState {
  const message = getApiErrorMessage(error, messages.actions.api.requestFailed);

  if (!(error instanceof ApiRequestError) || error.status !== 409) {
    return {
      error: message,
    } satisfies BindingActionState;
  }

  const matchedRunId = message.match(/run id:\s*([a-z0-9]+)/i)?.[1];

  if (!matchedRunId) {
    return {
      error: message,
    } satisfies BindingActionState;
  }

  return {
    actionHref: `/runs/${matchedRunId}`,
    actionLabel: messages.actions.bindings.viewCurrentRun,
    error: message,
  } satisfies BindingActionState;
}

export async function upsertBindingAction(
  _previousState: BindingActionState,
  formData: FormData,
): Promise<BindingActionState> {
  const { messages } = await getRequestMessages();
  const bindingSchema = createBindingSchema(messages);
  const parsed = bindingSchema.safeParse({
    xUserId: getOptionalTextValue(formData, "xUserId"),
    username: getOptionalTextValue(formData, "username"),
    displayName: getOptionalTextValue(formData, "displayName"),
    avatarUrl: getOptionalTextValue(formData, "avatarUrl") ?? "",
    credentialSource: getOptionalTextValue(formData, "credentialSource"),
    credentialPayload: getOptionalTextValue(formData, "credentialPayload"),
    crawlEnabled: formData.get("crawlEnabled") === "on",
    crawlIntervalMinutes: getOptionalTextValue(
      formData,
      "crawlIntervalMinutes",
    ),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.bindings.bindingValidationFailed,
    } satisfies BindingActionState;
  }

  try {
    await apiRequest({
      path: "/bindings",
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    revalidatePath("/bindings");

    return {
      success: messages.actions.bindings.bindingSaved,
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
    } satisfies BindingActionState;
  }
}

export async function updateCrawlConfigAction(
  _previousState: BindingActionState,
  formData: FormData,
): Promise<BindingActionState> {
  const { messages } = await getRequestMessages();
  const crawlConfigSchema = createCrawlConfigSchema(messages);
  const parsed = crawlConfigSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
    crawlEnabled: formData.get("crawlEnabled") === "on",
    crawlIntervalMinutes: getOptionalTextValue(
      formData,
      "crawlIntervalMinutes",
    ),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.bindings.configValidationFailed,
    } satisfies BindingActionState;
  }

  try {
    await apiRequest({
      path: `/bindings/${parsed.data.bindingId}/crawl-config`,
      method: "PATCH",
      body: JSON.stringify({
        crawlEnabled: parsed.data.crawlEnabled,
        crawlIntervalMinutes: parsed.data.crawlIntervalMinutes,
      }),
    });

    revalidatePath("/bindings");

    return {
      success: messages.actions.bindings.configSaved,
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
    } satisfies BindingActionState;
  }
}

export async function revalidateBindingAction(
  _previousState: BindingActionState,
  formData: FormData,
): Promise<BindingActionState> {
  const { messages } = await getRequestMessages();
  const bindingOperationSchema = createBindingOperationSchema(messages);
  const parsed = bindingOperationSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.bindings.missingBindingId,
    } satisfies BindingActionState;
  }

  try {
    await apiRequest({
      path: `/bindings/${parsed.data.bindingId}/validate`,
      method: "POST",
      body: JSON.stringify({}),
    });

    revalidatePath("/bindings");

    return {
      success: messages.actions.bindings.bindingRevalidated,
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
    } satisfies BindingActionState;
  }
}

export async function disableBindingAction(
  _previousState: BindingActionState,
  formData: FormData,
): Promise<BindingActionState> {
  const { messages } = await getRequestMessages();
  const bindingOperationSchema = createBindingOperationSchema(messages);
  const parsed = bindingOperationSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.bindings.missingBindingId,
    } satisfies BindingActionState;
  }

  try {
    await apiRequest({
      path: `/bindings/${parsed.data.bindingId}/disable`,
      method: "POST",
      body: JSON.stringify({}),
    });

    revalidatePath("/bindings");

    return {
      success: messages.actions.bindings.bindingDisabled,
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
    } satisfies BindingActionState;
  }
}

export async function unbindBindingAction(
  _previousState: BindingActionState,
  formData: FormData,
): Promise<BindingActionState> {
  const { messages } = await getRequestMessages();
  const bindingOperationSchema = createBindingOperationSchema(messages);
  const parsed = bindingOperationSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.bindings.missingBindingId,
    } satisfies BindingActionState;
  }

  try {
    const result = await apiRequest<UnbindBindingResponse>({
      path: `/bindings/${parsed.data.bindingId}/unbind`,
      method: "POST",
      body: JSON.stringify({}),
    });

    revalidatePath("/bindings");
    revalidatePath("/dashboard");
    revalidatePath("/archives");
    revalidatePath("/runs");

    return {
      success: formatMessage(messages.actions.bindings.bindingUnbound, {
        deletedArchiveCount: result.deletedArchiveCount,
        deletedRunCount: result.deletedRunCount,
      }),
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
    } satisfies BindingActionState;
  }
}

export async function triggerManualCrawlAction(
  _previousState: BindingActionState,
  formData: FormData,
): Promise<BindingActionState> {
  const { messages } = await getRequestMessages();
  const bindingOperationSchema = createBindingOperationSchema(messages);
  const parsed = bindingOperationSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.bindings.missingBindingId,
    } satisfies BindingActionState;
  }

  try {
    const run = await apiRequest<ManualCrawlRunResponse>({
      path: `/bindings/${parsed.data.bindingId}/crawl-now`,
      method: "POST",
      body: JSON.stringify({}),
    });

    revalidatePath("/bindings");
    revalidatePath("/dashboard");
    revalidatePath("/archives");
    revalidatePath("/runs");

    return {
      actionHref: `/runs/${run.id}`,
      actionLabel: messages.actions.bindings.viewTriggeredRun,
      success: formatMessage(messages.actions.bindings.manualCrawlTriggered, {
        status: run.status,
        triggerType: run.triggerType,
      }),
    } satisfies BindingActionState;
  } catch (error) {
    return buildManualCrawlErrorState(error, messages);
  }
}

export async function createCrawlProfileAction(
  _previousState: BindingActionState,
  formData: FormData,
): Promise<BindingActionState> {
  const { messages } = await getRequestMessages();
  const crawlProfileSchema = createCrawlProfileSchema(messages);
  const parsed = crawlProfileSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
    mode: getOptionalTextValue(formData, "mode"),
    enabled: formData.get("enabled") === "on",
    scheduleKind: getOptionalTextValue(formData, "scheduleKind"),
    scheduleCron: getOptionalTextValue(formData, "scheduleCron"),
    intervalMinutes: getOptionalTextValue(formData, "intervalMinutes"),
    queryText: getOptionalTextValue(formData, "queryText"),
    maxPosts: getOptionalTextValue(formData, "maxPosts"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.bindings.profileValidationFailed,
    } satisfies BindingActionState;
  }

  try {
    await apiRequest({
      path: `/bindings/${parsed.data.bindingId}/crawl-profiles`,
      method: "POST",
      body: JSON.stringify({
        mode: parsed.data.mode,
        enabled: parsed.data.enabled,
        scheduleKind: parsed.data.scheduleKind,
        scheduleCron: parsed.data.scheduleCron,
        intervalMinutes: parsed.data.intervalMinutes,
        queryText: parsed.data.queryText,
        maxPosts: parsed.data.maxPosts,
      }),
    });

    revalidatePath("/bindings");
    revalidatePath("/strategies");

    return {
      success: messages.actions.bindings.profileCreated,
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
    } satisfies BindingActionState;
  }
}

export async function updateCrawlProfileAction(
  _previousState: BindingActionState,
  formData: FormData,
): Promise<BindingActionState> {
  const { messages } = await getRequestMessages();
  const profileOperationSchema = createCrawlProfileOperationSchema(messages);
  const parsedOperation = profileOperationSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
    profileId: getOptionalTextValue(formData, "profileId"),
  });

  if (!parsedOperation.success) {
    return {
      error:
        parsedOperation.error.issues[0]?.message ??
        messages.actions.bindings.missingProfileId,
    } satisfies BindingActionState;
  }

  const crawlProfileSchema = createUpdateCrawlProfileSchema(messages);
  const parsed = crawlProfileSchema.safeParse({
    mode: getOptionalTextValue(formData, "mode"),
    enabled: formData.get("enabled") === "on",
    scheduleKind: getOptionalTextValue(formData, "scheduleKind"),
    scheduleCron: getOptionalTextValue(formData, "scheduleCron"),
    intervalMinutes: getOptionalTextValue(formData, "intervalMinutes"),
    queryText: getOptionalTextValue(formData, "queryText"),
    maxPosts: getOptionalTextValue(formData, "maxPosts"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.bindings.profileValidationFailed,
    } satisfies BindingActionState;
  }

  try {
    await apiRequest({
      path: `/bindings/${parsedOperation.data.bindingId}/crawl-profiles/${parsedOperation.data.profileId}`,
      method: "PATCH",
      body: JSON.stringify({
        enabled: parsed.data.enabled,
        scheduleKind: parsed.data.scheduleKind,
        scheduleCron: parsed.data.scheduleCron,
        intervalMinutes: parsed.data.intervalMinutes,
        queryText: parsed.data.queryText,
        maxPosts: parsed.data.maxPosts,
      }),
    });

    revalidatePath("/bindings");
    revalidatePath("/strategies");

    return {
      success: messages.actions.bindings.profileUpdated,
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
    } satisfies BindingActionState;
  }
}

export async function triggerCrawlProfileAction(
  _previousState: BindingActionState,
  formData: FormData,
): Promise<BindingActionState> {
  const { messages } = await getRequestMessages();
  const profileOperationSchema = createCrawlProfileOperationSchema(messages);
  const parsed = profileOperationSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
    profileId: getOptionalTextValue(formData, "profileId"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.bindings.missingProfileId,
    } satisfies BindingActionState;
  }

  try {
    const run = await apiRequest<ManualCrawlRunResponse>({
      path: `/bindings/${parsed.data.bindingId}/crawl-profiles/${parsed.data.profileId}/crawl-now`,
      method: "POST",
      body: JSON.stringify({}),
    });

    revalidatePath("/bindings");
    revalidatePath("/strategies");
    revalidatePath("/dashboard");
    revalidatePath("/archives");
    revalidatePath("/runs");

    return {
      actionHref: `/runs/${run.id}`,
      actionLabel: messages.actions.bindings.viewTriggeredRun,
      success: formatMessage(messages.actions.bindings.profileManualTriggered, {
        status: run.status,
        triggerType: run.triggerType,
      }),
    } satisfies BindingActionState;
  } catch (error) {
    return buildManualCrawlErrorState(error, messages);
  }
}
