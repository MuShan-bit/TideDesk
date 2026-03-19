import {
  CrawlerAdapterError,
  CrawlerRateLimitError,
} from './errors/crawler-adapter.error';

type RetryCrawlerOperationOptions = {
  baseDelayMs?: number;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
};

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getRetryDelayMs(
  error: CrawlerAdapterError,
  attempt: number,
  baseDelayMs: number,
) {
  if (error instanceof CrawlerRateLimitError && error.retryAfterMs) {
    return error.retryAfterMs;
  }

  return baseDelayMs * attempt;
}

export async function retryCrawlerOperation<T>(
  operation: () => Promise<T> | T,
  options: RetryCrawlerOperationOptions = {},
) {
  const { maxAttempts = 3, baseDelayMs = 200, sleep = defaultSleep } = options;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      return await operation();
    } catch (error) {
      if (!(error instanceof CrawlerAdapterError)) {
        throw error;
      }

      if (!error.retryable || attempt >= maxAttempts) {
        throw error;
      }

      await sleep(getRetryDelayMs(error, attempt, baseDelayMs));
    }
  }

  throw new Error('Crawler retry loop exited unexpectedly');
}
