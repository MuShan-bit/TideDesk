import { CrawlRunStatus, CrawlTriggerType, type Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateCrawlRunInput = {
  bindingId: string;
  crawlJobId?: string | null;
  crawlProfileId?: string | null;
  triggerType: CrawlTriggerType;
};

type CompleteCrawlRunInput = {
  errorMessage?: string | null;
  failedCount?: number;
  fetchedCount?: number;
  finishedAt?: Date;
  newCount?: number;
  skippedCount?: number;
  status: CrawlRunStatus;
};

type ListCrawlRunsOptions = {
  page?: number;
  pageSize?: number;
};

export const crawlRunExecutionArgs = {
  include: {
    binding: true,
    crawlJob: true,
    crawlProfile: true,
  },
} satisfies Prisma.CrawlRunDefaultArgs;

const crawlRunDetailArgs = {
  include: {
    binding: true,
    crawlJob: true,
    crawlProfile: true,
    runPosts: {
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        archivedPost: true,
      },
    },
  },
} satisfies Prisma.CrawlRunDefaultArgs;

export type CrawlExecutionRun = Prisma.CrawlRunGetPayload<
  typeof crawlRunExecutionArgs
>;

@Injectable()
export class CrawlRunsService {
  constructor(private readonly prisma: PrismaService) {}

  createQueuedRun(input: CreateCrawlRunInput) {
    return this.prisma.crawlRun.create({
      data: {
        bindingId: input.bindingId,
        crawlJobId: input.crawlJobId ?? null,
        crawlProfileId: input.crawlProfileId ?? null,
        triggerType: input.triggerType,
        status: CrawlRunStatus.QUEUED,
      },
      include: {
        binding: true,
        crawlJob: true,
        crawlProfile: true,
      },
    });
  }

  getById(id: string) {
    return this.prisma.crawlRun.findUnique({
      where: { id },
      ...crawlRunDetailArgs,
    });
  }

  async getDetailByUser(userId: string, runId: string) {
    const run = await this.prisma.crawlRun.findFirst({
      where: {
        id: runId,
        binding: {
          userId,
        },
      },
      ...crawlRunDetailArgs,
    });

    if (!run) {
      throw new NotFoundException('Crawl run not found');
    }

    return run;
  }

  getExecutionRunById(id: string): Promise<CrawlExecutionRun | null> {
    return this.prisma.crawlRun.findUnique({
      where: { id },
      ...crawlRunExecutionArgs,
    });
  }

  async markRunning(id: string, startedAt = new Date()) {
    const result = await this.prisma.crawlRun.updateMany({
      where: {
        id,
        status: CrawlRunStatus.QUEUED,
      },
      data: {
        status: CrawlRunStatus.RUNNING,
        startedAt,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.prisma.crawlRun.findUnique({
      where: { id },
      ...crawlRunExecutionArgs,
    });
  }

  markCompleted(id: string, input: CompleteCrawlRunInput) {
    const data: Prisma.CrawlRunUpdateInput = {
      status: input.status,
      finishedAt: input.finishedAt ?? new Date(),
      fetchedCount: input.fetchedCount ?? 0,
      newCount: input.newCount ?? 0,
      skippedCount: input.skippedCount ?? 0,
      failedCount: input.failedCount ?? 0,
      errorMessage: input.errorMessage ?? null,
    };

    return this.prisma.crawlRun.update({
      where: { id },
      data,
      include: {
        binding: true,
        crawlJob: true,
        crawlProfile: true,
        runPosts: true,
      },
    });
  }

  async listByUser(userId: string, options: ListCrawlRunsOptions = {}) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.crawlRun.findMany({
        where: {
          binding: {
            userId,
          },
        },
        include: {
          binding: true,
          crawlJob: true,
          crawlProfile: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.crawlRun.count({
        where: {
          binding: {
            userId,
          },
        },
      }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
    };
  }
}
