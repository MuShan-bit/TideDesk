export const FEED_CRAWLER_ADAPTER = Symbol('FEED_CRAWLER_ADAPTER');

export const crawlerAdapterNames = ['mock', 'real'] as const;

export type CrawlerAdapterName = (typeof crawlerAdapterNames)[number];
