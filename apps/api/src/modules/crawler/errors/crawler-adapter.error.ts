export type CrawlerAdapterErrorCode =
  | 'AUTH'
  | 'NETWORK'
  | 'RATE_LIMIT'
  | 'STRUCTURE_CHANGED'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export class CrawlerAdapterError extends Error {
  constructor(
    message: string,
    readonly code: CrawlerAdapterErrorCode = 'UNKNOWN',
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'CrawlerAdapterError';
  }
}

export class CrawlerAuthError extends CrawlerAdapterError {
  constructor(message = 'Credential validation failed') {
    super(message, 'AUTH', false);
    this.name = 'CrawlerAuthError';
  }
}

export class CrawlerNetworkError extends CrawlerAdapterError {
  constructor(message = 'Crawler request failed due to a network error') {
    super(message, 'NETWORK', true);
    this.name = 'CrawlerNetworkError';
  }
}

export class CrawlerRateLimitError extends CrawlerAdapterError {
  constructor(
    message = 'Crawler request was rate limited',
    readonly retryAfterMs?: number,
  ) {
    super(message, 'RATE_LIMIT', true);
    this.name = 'CrawlerRateLimitError';
  }
}

export class CrawlerStructureChangedError extends CrawlerAdapterError {
  constructor(message = 'Crawler could not parse the upstream response') {
    super(message, 'STRUCTURE_CHANGED', false);
    this.name = 'CrawlerStructureChangedError';
  }
}

export class CrawlerUnsupportedError extends CrawlerAdapterError {
  constructor(message = 'Crawler adapter operation is not implemented yet') {
    super(message, 'UNSUPPORTED', false);
    this.name = 'CrawlerUnsupportedError';
  }
}
