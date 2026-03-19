import { redactSensitiveResponse } from './sensitive-response';

export function serializeForJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(redactSensitiveResponse(value), (_key, nestedValue: unknown) => {
      return typeof nestedValue === 'bigint'
        ? nestedValue.toString()
        : nestedValue;
    }),
  ) as T;
}
