import { Module } from '@nestjs/common';
import { CrawlJobsModule } from '../crawl-jobs/crawl-jobs.module';
import { CryptoModule } from '../crypto/crypto.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { BindingsController } from './bindings.controller';
import { BindingsService } from './bindings.service';

@Module({
  imports: [CryptoModule, CrawlerModule, CrawlJobsModule],
  controllers: [BindingsController],
  providers: [BindingsService],
})
export class BindingsModule {}
