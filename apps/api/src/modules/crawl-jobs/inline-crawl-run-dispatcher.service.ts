import { Injectable } from '@nestjs/common';
import { type CrawlExecutionRun } from '../crawl-runs/crawl-runs.service';
import { CrawlExecutionService } from './crawl-execution.service';
import type {
  CrawlRunDispatchResult,
  CrawlRunDispatcher,
} from './crawl-run-dispatcher.types';

@Injectable()
export class InlineCrawlRunDispatcherService implements CrawlRunDispatcher {
  constructor(private readonly crawlExecutionService: CrawlExecutionService) {}

  dispatchClaimedRun(
    run: CrawlExecutionRun,
    processedAt?: Date,
  ): Promise<CrawlRunDispatchResult> {
    return this.crawlExecutionService.processClaimedRun(run, processedAt);
  }

  dispatchRun(
    runId: string,
    processedAt?: Date,
  ): Promise<CrawlRunDispatchResult> {
    return this.crawlExecutionService.processRun(runId, processedAt);
  }
}
