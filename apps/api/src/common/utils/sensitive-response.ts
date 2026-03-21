const sensitiveResponseKeys = new Set([
  'authPayloadEncrypted',
  'apiKeyEncrypted',
  'apiKey',
  'capturedPayloadEncrypted',
  'passwordHash',
  'authToken',
  'ct0',
  'cookies',
]);

export function redactSensitiveResponse<T>(value: T): T {
  return redact(value) as T;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (
    value === null ||
    value === undefined ||
    value instanceof Date ||
    typeof value !== 'object'
  ) {
    return value;
  }

  const result: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (sensitiveResponseKeys.has(key)) {
      continue;
    }

    result[key] = redact(nestedValue);
  }

  return result;
}
