import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockFeedCrawlerAdapter } from './adapters/mock-feed-crawler.adapter';
import { RealFeedCrawlerAdapter } from './adapters/real-feed-crawler.adapter';
import { FEED_CRAWLER_ADAPTER } from './crawler.constants';
import type { FeedCrawlerAdapter } from './crawler.types';

@Module({
  providers: [
    MockFeedCrawlerAdapter,
    RealFeedCrawlerAdapter,
    {
      provide: FEED_CRAWLER_ADAPTER,
      inject: [ConfigService, MockFeedCrawlerAdapter, RealFeedCrawlerAdapter],
      useFactory: (
        configService: ConfigService,
        mockAdapter: MockFeedCrawlerAdapter,
        realAdapter: RealFeedCrawlerAdapter,
      ): FeedCrawlerAdapter => {
        const adapterName = configService.get<string>(
          'CRAWLER_ADAPTER_NAME',
          'mock',
        );

        return adapterName === 'real' ? realAdapter : mockAdapter;
      },
    },
  ],
  exports: [FEED_CRAWLER_ADAPTER],
})
export class CrawlerModule {}
