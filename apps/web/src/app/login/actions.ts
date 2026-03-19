"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { signInSchema } from "@/lib/auth-schema";
import { getAppBaseUrl } from "@/lib/app-url";
import { createDatabaseSession, persistCredentialsAccount } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export type LoginFormState = {
  error?: string;
};

function normalizeCallbackUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return "/dashboard";
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const callbackUrl = new URL(value);
    const appBaseUrl = getAppBaseUrl();
    const appUrl = appBaseUrl ? new URL(appBaseUrl) : null;

    if (appUrl && callbackUrl.origin === appUrl.origin) {
      return `${callbackUrl.pathname}${callbackUrl.search}`;
    }
  } catch {
    return "/dashboard";
  }

  return "/dashboard";
}

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
) {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = signInSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "登录信息格式不正确",
    } satisfies LoginFormState;
  }

  const callbackUrl = normalizeCallbackUrl(formData.get("callbackUrl"));
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user?.passwordHash) {
    return {
      error: "邮箱或密码错误，请检查后重试。",
    } satisfies LoginFormState;
  }

  const isPasswordValid = await compare(parsed.data.password, user.passwordHash);

  if (!isPasswordValid) {
    return {
      error: "邮箱或密码错误，请检查后重试。",
    } satisfies LoginFormState;
  }

  try {
    await persistCredentialsAccount(user.id);
    await createDatabaseSession(user.id);
  } catch (error) {
    if (error instanceof Error) {
      return {
        error: error.message || "登录失败，请稍后重试。",
      } satisfies LoginFormState;
    }

    return {
      error: "登录失败，请稍后重试。",
    } satisfies LoginFormState;
  }

  redirect(callbackUrl);
}
