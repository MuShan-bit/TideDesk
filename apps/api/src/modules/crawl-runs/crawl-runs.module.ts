import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CrawlRunPostsService } from './crawl-run-posts.service';
import { CrawlRunsService } from './crawl-runs.service';

@Module({
  imports: [PrismaModule],
  providers: [CrawlRunsService, CrawlRunPostsService],
  exports: [CrawlRunsService, CrawlRunPostsService],
})
export class CrawlRunsModule {}
