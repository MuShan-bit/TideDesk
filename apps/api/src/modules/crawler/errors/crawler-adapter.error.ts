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

export class CrawlerUnsupportedError extends CrawlerAdapterError {
  constructor(message = 'Crawler adapter operation is not implemented yet') {
    super(message, 'UNSUPPORTED', false);
    this.name = 'CrawlerUnsupportedError';
  }
}
