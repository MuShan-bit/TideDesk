export function normalizeAppUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

export function getAppBaseUrl() {
  const explicitUrl = normalizeAppUrl(process.env.NEXTAUTH_URL);

  if (explicitUrl) {
    return explicitUrl;
  }

  if (process.env.VERCEL_ENV === "production") {
    return normalizeAppUrl(
      process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL,
    );
  }

  return normalizeAppUrl(
    process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL,
  );
}
