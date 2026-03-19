import { Module } from '@nestjs/common';
import { ArchivesModule } from '../archives/archives.module';
import { CrawlRunsModule } from '../crawl-runs/crawl-runs.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { CryptoModule } from '../crypto/crypto.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CrawlExecutionService } from './crawl-execution.service';
import { CrawlJobsScheduler } from './crawl-jobs.scheduler';
import { CrawlJobsService } from './crawl-jobs.service';

@Module({
  imports: [
    PrismaModule,
    ArchivesModule,
    CrawlRunsModule,
    CrawlerModule,
    CryptoModule,
  ],
  providers: [CrawlJobsService, CrawlJobsScheduler, CrawlExecutionService],
  exports: [CrawlJobsService, CrawlJobsScheduler, CrawlExecutionService],
})
export class CrawlJobsModule {}
