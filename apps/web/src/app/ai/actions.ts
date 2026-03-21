"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import { getRequestMessages } from "@/lib/request-locale";

export type AiActionState = {
  error?: string;
  success?: string;
};

const providerTypeValues = [
  "OPENAI",
  "ANTHROPIC",
  "GEMINI",
  "OPENAI_COMPATIBLE",
] as const;
const taskTypeValues = [
  "POST_CLASSIFY",
  "REPORT_SUMMARY",
  "DRAFT_REWRITE",
] as const;

function getOptionalTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function getBooleanValue(formData: FormData, key: string, defaultValue = true) {
  const value = formData.get(key);

  if (value === "true" || value === "on") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return defaultValue;
}

function getNullableNumberValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (value === null || typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function revalidateAiViews() {
  revalidatePath("/ai");
  revalidatePath("/settings/ai");
}

function parseParametersJsonValue(
  rawValue: string | undefined,
  invalidMessage: string,
) {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return invalidMessage;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return invalidMessage;
  }
}

export async function createProviderAction(
  _previousState: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    providerType: z.enum(providerTypeValues, {
      message: messages.actions.ai.missingProviderType,
    }),
    name: z.string().trim().min(1, messages.actions.ai.missingProviderName),
    baseUrl: z.string().trim().optional(),
    apiKey: z.string().trim().min(1, messages.actions.ai.missingApiKey),
    enabled: z.boolean(),
  });
  const parsed = schema.safeParse({
    providerType: getOptionalTextValue(formData, "providerType"),
    name: getOptionalTextValue(formData, "name") ?? "",
    baseUrl: getOptionalTextValue(formData, "baseUrl"),
    apiKey: getOptionalTextValue(formData, "apiKey") ?? "",
    enabled: getBooleanValue(formData, "enabled"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.ai.providerValidationFailed,
    };
  }

  try {
    await apiRequest({
      path: "/ai/providers",
      method: "POST",
      body: JSON.stringify(parsed.data),
    });

    revalidateAiViews();

    return {
      success: messages.actions.ai.providerCreated,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.ai.providerValidationFailed,
      ),
    };
  }
}

export async function updateProviderAction(
  _previousState: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    providerId: z.string().trim().min(1, messages.actions.ai.missingProviderId),
    providerType: z.enum(providerTypeValues, {
      message: messages.actions.ai.missingProviderType,
    }),
    name: z.string().trim().min(1, messages.actions.ai.missingProviderName),
    baseUrl: z.string().trim().optional(),
    apiKey: z.string().trim().optional(),
    enabled: z.boolean(),
  });
  const parsed = schema.safeParse({
    providerId: getOptionalTextValue(formData, "providerId") ?? "",
    providerType: getOptionalTextValue(formData, "providerType"),
    name: getOptionalTextValue(formData, "name") ?? "",
    baseUrl: getOptionalTextValue(formData, "baseUrl"),
    apiKey: getOptionalTextValue(formData, "apiKey"),
    enabled: getBooleanValue(formData, "enabled"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.ai.providerValidationFailed,
    };
  }

  try {
    await apiRequest({
      path: `/ai/providers/${parsed.data.providerId}`,
      method: "PATCH",
      body: JSON.stringify({
        providerType: parsed.data.providerType,
        name: parsed.data.name,
        baseUrl: parsed.data.baseUrl,
        ...(parsed.data.apiKey ? { apiKey: parsed.data.apiKey } : {}),
        enabled: parsed.data.enabled,
      }),
    });

    revalidateAiViews();

    return {
      success: messages.actions.ai.providerUpdated,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.ai.providerValidationFailed,
      ),
    };
  }
}

export async function createModelAction(
  _previousState: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const { messages } = await getRequestMessages();
  const rawParameters = getOptionalTextValue(formData, "parametersJson");
  const parsedParameters = parseParametersJsonValue(
    rawParameters,
    messages.actions.ai.invalidParametersJson,
  );

  if (typeof parsedParameters === "string") {
    return {
      error: parsedParameters,
    };
  }

  const enabled = getBooleanValue(formData, "enabled");
  const isDefault = getBooleanValue(formData, "isDefault", false);

  if (isDefault && !enabled) {
    return {
      error: messages.actions.ai.defaultModelRequiresEnabled,
    };
  }

  const schema = z.object({
    providerConfigId: z
      .string()
      .trim()
      .min(1, messages.actions.ai.missingProviderConfigId),
    modelCode: z.string().trim().min(1, messages.actions.ai.missingModelCode),
    displayName: z
      .string()
      .trim()
      .min(1, messages.actions.ai.missingDisplayName),
    taskType: z.enum(taskTypeValues, {
      message: messages.actions.ai.missingTaskType,
    }),
    enabled: z.boolean(),
    isDefault: z.boolean(),
    inputTokenPriceUsd: z
      .number({
        message: messages.actions.ai.invalidTokenPrice,
      })
      .min(0, messages.actions.ai.invalidTokenPrice)
      .nullable()
      .optional(),
    outputTokenPriceUsd: z
      .number({
        message: messages.actions.ai.invalidTokenPrice,
      })
      .min(0, messages.actions.ai.invalidTokenPrice)
      .nullable()
      .optional(),
  });
  const parsed = schema.safeParse({
    providerConfigId: getOptionalTextValue(formData, "providerConfigId") ?? "",
    modelCode: getOptionalTextValue(formData, "modelCode") ?? "",
    displayName: getOptionalTextValue(formData, "displayName") ?? "",
    taskType: getOptionalTextValue(formData, "taskType"),
    enabled,
    isDefault,
    inputTokenPriceUsd: getNullableNumberValue(formData, "inputTokenPriceUsd"),
    outputTokenPriceUsd: getNullableNumberValue(
      formData,
      "outputTokenPriceUsd",
    ),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.ai.modelValidationFailed,
    };
  }

  try {
    await apiRequest({
      path: "/ai/models",
      method: "POST",
      body: JSON.stringify({
        ...parsed.data,
        parametersJson: parsedParameters,
      }),
    });

    revalidateAiViews();

    return {
      success: messages.actions.ai.modelCreated,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.ai.modelValidationFailed,
      ),
    };
  }
}

export async function updateModelAction(
  _previousState: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const { messages } = await getRequestMessages();
  const rawParameters = getOptionalTextValue(formData, "parametersJson");
  const parsedParameters = parseParametersJsonValue(
    rawParameters,
    messages.actions.ai.invalidParametersJson,
  );

  if (typeof parsedParameters === "string") {
    return {
      error: parsedParameters,
    };
  }

  const enabled = getBooleanValue(formData, "enabled");
  const isDefault = getBooleanValue(formData, "isDefault", false);

  if (isDefault && !enabled) {
    return {
      error: messages.actions.ai.defaultModelRequiresEnabled,
    };
  }

  const schema = z.object({
    modelId: z.string().trim().min(1, messages.actions.ai.missingModelId),
    providerConfigId: z
      .string()
      .trim()
      .min(1, messages.actions.ai.missingProviderConfigId),
    modelCode: z.string().trim().min(1, messages.actions.ai.missingModelCode),
    displayName: z
      .string()
      .trim()
      .min(1, messages.actions.ai.missingDisplayName),
    taskType: z.enum(taskTypeValues, {
      message: messages.actions.ai.missingTaskType,
    }),
    enabled: z.boolean(),
    isDefault: z.boolean(),
    inputTokenPriceUsd: z
      .number({
        message: messages.actions.ai.invalidTokenPrice,
      })
      .min(0, messages.actions.ai.invalidTokenPrice)
      .nullable()
      .optional(),
    outputTokenPriceUsd: z
      .number({
        message: messages.actions.ai.invalidTokenPrice,
      })
      .min(0, messages.actions.ai.invalidTokenPrice)
      .nullable()
      .optional(),
  });
  const parsed = schema.safeParse({
    modelId: getOptionalTextValue(formData, "modelId") ?? "",
    providerConfigId: getOptionalTextValue(formData, "providerConfigId") ?? "",
    modelCode: getOptionalTextValue(formData, "modelCode") ?? "",
    displayName: getOptionalTextValue(formData, "displayName") ?? "",
    taskType: getOptionalTextValue(formData, "taskType"),
    enabled,
    isDefault,
    inputTokenPriceUsd: getNullableNumberValue(formData, "inputTokenPriceUsd"),
    outputTokenPriceUsd: getNullableNumberValue(
      formData,
      "outputTokenPriceUsd",
    ),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.ai.modelValidationFailed,
    };
  }

  try {
    await apiRequest({
      path: `/ai/models/${parsed.data.modelId}`,
      method: "PATCH",
      body: JSON.stringify({
        providerConfigId: parsed.data.providerConfigId,
        modelCode: parsed.data.modelCode,
        displayName: parsed.data.displayName,
        taskType: parsed.data.taskType,
        enabled: parsed.data.enabled,
        isDefault: parsed.data.isDefault,
        parametersJson: parsedParameters,
        inputTokenPriceUsd: parsed.data.inputTokenPriceUsd,
        outputTokenPriceUsd: parsed.data.outputTokenPriceUsd,
      }),
    });

    revalidateAiViews();

    return {
      success: messages.actions.ai.modelUpdated,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.ai.modelValidationFailed,
      ),
    };
  }
}

export async function setDefaultModelAction(
  _previousState: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    modelId: z.string().trim().min(1, messages.actions.ai.missingModelId),
  });
  const parsed = schema.safeParse({
    modelId: getOptionalTextValue(formData, "modelId") ?? "",
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.ai.modelValidationFailed,
    };
  }

  try {
    await apiRequest({
      path: `/ai/models/${parsed.data.modelId}`,
      method: "PATCH",
      body: JSON.stringify({
        isDefault: true,
      }),
    });

    revalidateAiViews();

    return {
      success: messages.actions.ai.modelDefaultUpdated,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.ai.modelValidationFailed,
      ),
    };
  }
}

export async function testProviderAction(
  _previousState: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const { messages } = await getRequestMessages();
  const schema = z.object({
    providerId: z.string().trim().min(1, messages.actions.ai.missingProviderId),
    modelConfigId: z.string().trim().optional(),
  });
  const parsed = schema.safeParse({
    providerId: getOptionalTextValue(formData, "providerId") ?? "",
    modelConfigId: getOptionalTextValue(formData, "modelConfigId"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        messages.actions.ai.providerValidationFailed,
    };
  }

  try {
    const result = await apiRequest<{
      modelCode: string;
      text: string;
    }>({
      path: `/ai/providers/${parsed.data.providerId}/test`,
      method: "POST",
      body: JSON.stringify({
        modelConfigId: parsed.data.modelConfigId,
      }),
    });

    return {
      success: formatMessage(messages.actions.ai.providerTested, {
        model: result.modelCode,
        text: result.text,
      }),
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(
        error,
        messages.actions.ai.providerValidationFailed,
      ),
    };
  }
}
