import "server-only";
import { auth } from "@/auth";

type ApiRequestInit = RequestInit & {
  path: string;
};

export async function apiRequest<T>({ path, ...init }: ApiRequestInit): Promise<T> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Missing authenticated user context");
  }

  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("x-internal-auth", process.env.INTERNAL_API_SHARED_SECRET ?? "");
  headers.set("x-user-id", session.user.id);

  if (session.user.email) {
    headers.set("x-user-email", session.user.email);
  }

  if (session.user.role) {
    headers.set("x-user-role", session.user.role);
  }

  const response = await fetch(`${process.env.INTERNAL_API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    let message = `API request failed with status ${response.status}`;

    if (errorPayload) {
      try {
        const parsed = JSON.parse(errorPayload) as {
          message?: string | string[];
        };

        if (typeof parsed.message === "string" && parsed.message.length > 0) {
          message = parsed.message;
        } else if (Array.isArray(parsed.message) && parsed.message.length > 0) {
          message = parsed.message.join("；");
        }
      } catch {
        message = errorPayload;
      }
    }

    throw new Error(message);
  }

  const payload = await response.text();

  if (!payload) {
    return null as T;
  }

  return JSON.parse(payload) as T;
}
