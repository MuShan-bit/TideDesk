import {
  BindingStatus,
  CrawlMode,
  CrawlRunStatus,
  CrawlTriggerType,
  type Prisma,
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
  jobId: string | null;
  profileId: string;
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
      await this.backfillMissingDefaultProfiles(tx);

      const claimableJobs = await tx.$queryRaw<ClaimableCrawlJobRow[]>`
        SELECT
          cp.id AS "profileId",
          cp.binding_id AS "bindingId",
          cj.id AS "jobId"
        FROM crawl_profiles cp
        INNER JOIN x_account_bindings xab ON xab.id = cp.binding_id
        LEFT JOIN crawl_jobs cj ON cj.binding_id = cp.binding_id
        WHERE
          cp.enabled = TRUE
          AND cp.next_run_at IS NOT NULL
          AND cp.next_run_at <= ${now}
          AND xab.crawl_enabled = TRUE
          AND xab.status = 'ACTIVE'
          AND pg_try_advisory_xact_lock(hashtext(cp.binding_id))
          AND NOT EXISTS (
            SELECT 1
            FROM crawl_runs cr
            WHERE
              cr.binding_id = cp.binding_id
              AND cr.status IN ('QUEUED', 'RUNNING')
          )
        ORDER BY cp.next_run_at ASC, cp.created_at ASC
        LIMIT ${limit}
        FOR UPDATE OF cp SKIP LOCKED
      `;

      return this.createClaimedRuns(tx, claimableJobs, triggerType);
    });
  }

  claimJobForBinding(
    bindingId: string,
    triggerType: CrawlTriggerType = CrawlTriggerType.MANUAL,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.backfillMissingDefaultProfiles(tx, bindingId);

      const claimableJobs = await tx.$queryRaw<ClaimableCrawlJobRow[]>`
        SELECT
          cp.id AS "profileId",
          cp.binding_id AS "bindingId",
          cj.id AS "jobId"
        FROM crawl_profiles cp
        INNER JOIN x_account_bindings xab ON xab.id = cp.binding_id
        LEFT JOIN crawl_jobs cj ON cj.binding_id = cp.binding_id
        WHERE
          cp.binding_id = ${bindingId}
          AND cp.mode = 'RECOMMENDED'
          AND xab.status = 'ACTIVE'
          AND pg_try_advisory_xact_lock(hashtext(cp.binding_id))
          AND NOT EXISTS (
            SELECT 1
            FROM crawl_runs cr
            WHERE
              cr.binding_id = cp.binding_id
              AND cr.status IN ('QUEUED', 'RUNNING')
          )
        ORDER BY cp.created_at ASC
        LIMIT 1
        FOR UPDATE OF cp SKIP LOCKED
      `;

      return this.createClaimedRuns(tx, claimableJobs, triggerType);
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

  private async createClaimedRuns(
    tx: Prisma.TransactionClient,
    claimableJobs: ClaimableCrawlJobRow[],
    triggerType: CrawlTriggerType,
  ) {
    if (claimableJobs.length === 0) {
      return [];
    }

    const runIds: string[] = [];

    for (const job of claimableJobs) {
      const createdRun = await tx.crawlRun.create({
        data: {
          bindingId: job.bindingId,
          crawlJobId: job.jobId,
          crawlProfileId: job.profileId,
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
        crawlProfile: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  private async backfillMissingDefaultProfiles(
    tx: Prisma.TransactionClient,
    bindingId?: string,
  ) {
    const bindings = await tx.xAccountBinding.findMany({
      where: {
        ...(bindingId ? { id: bindingId } : {}),
        crawlJob: {
          isNot: null,
        },
        crawlProfiles: {
          none: {
            mode: CrawlMode.RECOMMENDED,
          },
        },
      },
      include: {
        crawlJob: true,
      },
    });

    for (const binding of bindings) {
      if (!binding.crawlJob) {
        continue;
      }

      await tx.crawlProfile.create({
        data: {
          bindingId: binding.id,
          mode: CrawlMode.RECOMMENDED,
          enabled: binding.crawlEnabled && binding.crawlJob.enabled,
          intervalMinutes: binding.crawlJob.intervalMinutes,
          maxPosts: 20,
          lastRunAt: binding.crawlJob.lastRunAt,
          nextRunAt: binding.crawlJob.nextRunAt ?? binding.nextCrawlAt,
        },
      });
    }
  }
}
