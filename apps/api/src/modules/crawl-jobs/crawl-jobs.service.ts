import {
  BindingStatus,
  CrawlRunStatus,
  CrawlTriggerType,
} from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type FindDueCrawlJobsOptions = {
  limit?: number;
  now?: Date;
};

type UpdateCrawlJobScheduleInput = {
  enabled?: boolean;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
};

type ClaimDueCrawlJobsOptions = {
  limit?: number;
  now?: Date;
  triggerType?: CrawlTriggerType;
};

type ClaimableCrawlJobRow = {
  bindingId: string;
  jobId: string;
};

@Injectable()
export class CrawlJobsService {
  constructor(private readonly prisma: PrismaService) {}

  getByBindingId(bindingId: string) {
    return this.prisma.crawlJob.findUnique({
      where: { bindingId },
      include: { binding: true },
    });
  }

  findDueJobs(options: FindDueCrawlJobsOptions = {}) {
    const { now = new Date(), limit = 20 } = options;

    return this.prisma.crawlJob.findMany({
      where: {
        enabled: true,
        nextRunAt: {
          lte: now,
        },
        binding: {
          crawlEnabled: true,
          status: BindingStatus.ACTIVE,
        },
      },
      include: { binding: true },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
    });
  }

  claimDueJobs(options: ClaimDueCrawlJobsOptions = {}) {
    const {
      now = new Date(),
      limit = 20,
      triggerType = CrawlTriggerType.SCHEDULED,
    } = options;

    return this.prisma.$transaction(async (tx) => {
      const claimableJobs = await tx.$queryRaw<ClaimableCrawlJobRow[]>`
        SELECT
          cj.id AS "jobId",
          cj.binding_id AS "bindingId"
        FROM crawl_jobs cj
        INNER JOIN x_account_bindings xab ON xab.id = cj.binding_id
        WHERE
          cj.enabled = TRUE
          AND cj.next_run_at IS NOT NULL
          AND cj.next_run_at <= ${now}
          AND xab.crawl_enabled = TRUE
          AND xab.status = 'ACTIVE'
          AND NOT EXISTS (
            SELECT 1
            FROM crawl_runs cr
            WHERE
              cr.binding_id = cj.binding_id
              AND cr.status IN ('QUEUED', 'RUNNING')
          )
        ORDER BY cj.next_run_at ASC
        LIMIT ${limit}
        FOR UPDATE OF cj SKIP LOCKED
      `;

      if (claimableJobs.length === 0) {
        return [];
      }

      const runIds: string[] = [];

      for (const job of claimableJobs) {
        const createdRun = await tx.crawlRun.create({
          data: {
            bindingId: job.bindingId,
            crawlJobId: job.jobId,
            triggerType,
            status: CrawlRunStatus.QUEUED,
          },
          select: {
            id: true,
          },
        });

        runIds.push(createdRun.id);
      }

      return tx.crawlRun.findMany({
        where: {
          id: {
            in: runIds,
          },
        },
        include: {
          binding: true,
          crawlJob: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });
  }

  updateSchedule(jobId: string, input: UpdateCrawlJobScheduleInput) {
    return this.prisma.crawlJob.update({
      where: { id: jobId },
      data: {
        enabled: input.enabled,
        lastRunAt: input.lastRunAt,
        nextRunAt: input.nextRunAt,
      },
      include: { binding: true },
    });
  }
}
