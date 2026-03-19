"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiRequest } from "@/lib/api-client";

export type BindingActionState = {
  error?: string;
  success?: string;
};

type ManualCrawlRunResponse = {
  id: string;
  status: string;
  triggerType: string;
};

const credentialSourceSchema = z.enum(["WEB_LOGIN", "COOKIE_IMPORT", "EXTENSION"]);

const bindingSchema = z.object({
  xUserId: z.string().trim().min(1, "请填写 X 用户 ID"),
  username: z.string().trim().min(1, "请填写 X 用户名"),
  displayName: z.string().trim().optional(),
  avatarUrl: z
    .union([z.string().trim().url("头像地址必须是有效 URL"), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
  credentialSource: credentialSourceSchema,
  credentialPayload: z.string().trim().min(1, "请粘贴抓取凭证"),
  crawlEnabled: z.boolean(),
  crawlIntervalMinutes: z.coerce
    .number({ error: "请填写抓取周期" })
    .int("抓取周期必须为整数")
    .min(5, "抓取周期不能小于 5 分钟")
    .max(1440, "抓取周期不能超过 1440 分钟"),
});

const crawlConfigSchema = z.object({
  bindingId: z.string().trim().min(1, "缺少绑定 ID"),
  crawlEnabled: z.boolean(),
  crawlIntervalMinutes: z.coerce
    .number({ error: "请填写抓取周期" })
    .int("抓取周期必须为整数")
    .min(5, "抓取周期不能小于 5 分钟")
    .max(1440, "抓取周期不能超过 1440 分钟"),
});

const bindingOperationSchema = z.object({
  bindingId: z.string().trim().min(1, "缺少绑定 ID"),
});

function getOptionalTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

export async function upsertBindingAction(
  _previousState: BindingActionState,
  formData: FormData,
) {
  const parsed = bindingSchema.safeParse({
    xUserId: getOptionalTextValue(formData, "xUserId"),
    username: getOptionalTextValue(formData, "username"),
    displayName: getOptionalTextValue(formData, "displayName"),
    avatarUrl: getOptionalTextValue(formData, "avatarUrl") ?? "",
    credentialSource: getOptionalTextValue(formData, "credentialSource"),
    credentialPayload: getOptionalTextValue(formData, "credentialPayload"),
    crawlEnabled: formData.get("crawlEnabled") === "on",
    crawlIntervalMinutes: getOptionalTextValue(formData, "crawlIntervalMinutes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "绑定信息校验失败。",
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
      success: "绑定信息已保存。",
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getActionErrorMessage(error),
    } satisfies BindingActionState;
  }
}

export async function updateCrawlConfigAction(
  _previousState: BindingActionState,
  formData: FormData,
) {
  const parsed = crawlConfigSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
    crawlEnabled: formData.get("crawlEnabled") === "on",
    crawlIntervalMinutes: getOptionalTextValue(formData, "crawlIntervalMinutes"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "抓取配置校验失败。",
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
      success: "抓取配置已更新。",
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getActionErrorMessage(error),
    } satisfies BindingActionState;
  }
}

export async function revalidateBindingAction(
  _previousState: BindingActionState,
  formData: FormData,
) {
  const parsed = bindingOperationSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "缺少绑定 ID。",
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
      success: "绑定状态已重新校验。",
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getActionErrorMessage(error),
    } satisfies BindingActionState;
  }
}

export async function disableBindingAction(
  _previousState: BindingActionState,
  formData: FormData,
) {
  const parsed = bindingOperationSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "缺少绑定 ID。",
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
      success: "绑定已停用。",
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getActionErrorMessage(error),
    } satisfies BindingActionState;
  }
}

export async function triggerManualCrawlAction(
  _previousState: BindingActionState,
  formData: FormData,
) {
  const parsed = bindingOperationSchema.safeParse({
    bindingId: getOptionalTextValue(formData, "bindingId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "缺少绑定 ID。",
    } satisfies BindingActionState;
  }

  try {
    const run = await apiRequest<ManualCrawlRunResponse>({
      path: `/bindings/${parsed.data.bindingId}/crawl-now`,
      method: "POST",
      body: JSON.stringify({}),
    });

    revalidatePath("/bindings");
    revalidatePath("/runs");

    return {
      success: `手动抓取任务已入队，当前状态：${run.status}（${run.triggerType}）。`,
    } satisfies BindingActionState;
  } catch (error) {
    return {
      error: getActionErrorMessage(error),
    } satisfies BindingActionState;
  }
}
