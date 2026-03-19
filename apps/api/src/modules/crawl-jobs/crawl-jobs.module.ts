import { Module } from '@nestjs/common';
import { ArchivesModule } from '../archives/archives.module';
import { CrawlRunsModule } from '../crawl-runs/crawl-runs.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CRAWL_RUN_DISPATCHER } from './crawl-run-dispatcher.constants';
import { CrawlExecutionService } from './crawl-execution.service';
import { CrawlJobsScheduler } from './crawl-jobs.scheduler';
import { CrawlJobsService } from './crawl-jobs.service';
import { InlineCrawlRunDispatcherService } from './inline-crawl-run-dispatcher.service';

@Module({
  imports: [
    PrismaModule,
    ArchivesModule,
    CrawlRunsModule,
    CrawlerModule,
    CryptoModule,
  ],
  providers: [
    CrawlJobsService,
    CrawlJobsScheduler,
    CrawlExecutionService,
    InlineCrawlRunDispatcherService,
    {
      provide: CRAWL_RUN_DISPATCHER,
      useExisting: InlineCrawlRunDispatcherService,
    },
  ],
  exports: [
    CrawlJobsService,
    CrawlJobsScheduler,
    CrawlExecutionService,
    CRAWL_RUN_DISPATCHER,
  ],
})
export class CrawlJobsModule {}
