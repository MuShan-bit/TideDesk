import type { CrawlExecutionService } from './crawl-execution.service';
import type { CrawlExecutionRun } from '../crawl-runs/crawl-runs.service';

export type CrawlRunDispatchResult = Awaited<
  ReturnType<CrawlExecutionService['processClaimedRun']>
>;

export interface CrawlRunDispatcher {
  dispatchClaimedRun(
    run: CrawlExecutionRun,
    processedAt?: Date,
  ): Promise<CrawlRunDispatchResult>;
  dispatchRun(
    runId: string,
    processedAt?: Date,
  ): Promise<CrawlRunDispatchResult>;
}
