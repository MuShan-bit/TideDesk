import "server-only";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const authAdapter = PrismaAdapter(prisma);

export function getSessionCookieName() {
  const isSecure =
    getAppBaseUrl()?.startsWith("https://") ||
    process.env.AUTH_TRUST_HOST === "true";

  return isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";
}

export async function persistCredentialsAccount(userId: string) {
  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "credentials",
        providerAccountId: userId,
      },
    },
    update: {
      type: "credentials",
      userId,
    },
    create: {
      userId,
      type: "credentials",
      provider: "credentials",
      providerAccountId: userId,
    },
  });
}

export async function createDatabaseSession(userId: string) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
  });

  const cookieName = getSessionCookieName();
  const secure = cookieName.startsWith("__Secure-");
  const cookieStore = await cookies();

  cookieStore.set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    expires,
  });

  return {
    expires,
    sessionToken,
  };
}
