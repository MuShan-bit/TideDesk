import { Prisma, ReportStatus, ReportType } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_REPORT_PAGE = 1;
const DEFAULT_REPORT_PAGE_SIZE = 20;
const MAX_REPORT_PAGE_SIZE = 100;

const reportListInclude = {
  _count: {
    select: {
      sourcePosts: true,
    },
  },
} satisfies Prisma.ReportInclude;

const reportDetailInclude = {
  sourcePosts: {
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      archivedPost: {
        include: {
          binding: {
            select: {
              id: true,
              username: true,
              displayName: true,
            },
          },
          primaryCategory: true,
          tagAssignments: {
            include: {
              tag: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ReportInclude;

export type ReportListItem = Prisma.ReportGetPayload<{
  include: typeof reportListInclude;
}>;
export type ReportDetail = Prisma.ReportGetPayload<{
  include: typeof reportDetailInclude;
}>;

type CreateReportSourcePostInput = {
  archivedPostId: string;
  weightScore?: Prisma.Decimal | number | string | null;
};

export type CreateReportInput = {
  periodEnd: Date | string;
  periodStart: Date | string;
  renderedHtml?: string | null;
  reportType: ReportType;
  richTextJson?: Prisma.InputJsonValue;
  sourcePosts?: CreateReportSourcePostInput[];
  status?: ReportStatus;
  summaryJson?: Prisma.InputJsonValue;
  title: string;
};

type ListReportsOptions = {
  page?: number;
  pageSize?: number;
  reportType?: ReportType;
  status?: ReportStatus;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReportForUser(
    userId: string,
    input: CreateReportInput,
  ): Promise<ReportDetail> {
    this.assertSupportedReportType(input.reportType);

    const title = input.title.trim();

    if (title.length === 0) {
      throw new BadRequestException('Report title is required');
    }

    const periodStart = this.parseRequiredDate(
      input.periodStart,
      'Report period start is invalid',
    );
    const periodEnd = this.parseRequiredDate(
      input.periodEnd,
      'Report period end is invalid',
    );

    if (periodEnd <= periodStart) {
      throw new BadRequestException(
        'Report period end must be after period start',
      );
    }

    const sourcePosts = this.normalizeSourcePosts(input.sourcePosts ?? []);
    await this.ensureSourcePostsAvailable(
      userId,
      sourcePosts.map((item) => item.archivedPostId),
    );

    const reportCreateData: Prisma.ReportCreateInput = {
      user: {
        connect: {
          id: userId,
        },
      },
      reportType: input.reportType,
      status: input.status ?? ReportStatus.DRAFT,
      title,
      periodStart,
      periodEnd,
      richTextJson: input.richTextJson ?? {
        version: 1,
        blocks: [],
      },
      renderedHtml: input.renderedHtml ?? null,
      sourcePosts:
        sourcePosts.length > 0
          ? {
              create: sourcePosts.map((item) => ({
                archivedPost: {
                  connect: {
                    id: item.archivedPostId,
                  },
                },
                weightScore: item.weightScore,
              })),
            }
          : undefined,
    };

    if (input.summaryJson !== undefined) {
      reportCreateData.summaryJson = input.summaryJson;
    }

    return this.prisma.report.create({
      data: reportCreateData,
      include: reportDetailInclude,
    });
  }

  async listReportsByUser(userId: string, options: ListReportsOptions = {}) {
    const page = this.normalizePage(options.page);
    const pageSize = this.normalizePageSize(options.pageSize);
    const where: Prisma.ReportWhereInput = {
      userId,
    };

    if (options.reportType) {
      where.reportType = options.reportType;
    }

    if (options.status) {
      where.status = options.status;
    }

    const [total, items] = await Promise.all([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: reportListInclude,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getReportDetailForUser(userId: string, reportId: string) {
    const report = await this.prisma.report.findFirst({
      where: {
        id: reportId,
        userId,
      },
      include: reportDetailInclude,
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  private assertSupportedReportType(reportType: ReportType) {
    if (
      reportType !== ReportType.WEEKLY &&
      reportType !== ReportType.MONTHLY
    ) {
      throw new BadRequestException(
        'Only weekly and monthly reports are supported right now',
      );
    }
  }

  private normalizePage(value?: number) {
    if (!value || value < 1) {
      return DEFAULT_REPORT_PAGE;
    }

    return Math.floor(value);
  }

  private normalizePageSize(value?: number) {
    if (!value || value < 1) {
      return DEFAULT_REPORT_PAGE_SIZE;
    }

    return Math.min(Math.floor(value), MAX_REPORT_PAGE_SIZE);
  }

  private parseRequiredDate(value: Date | string, message: string) {
    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(message);
    }

    return parsedDate;
  }

  private normalizeSourcePosts(sourcePosts: CreateReportSourcePostInput[]) {
    const normalizedSourcePosts = new Map<
      string,
      {
        archivedPostId: string;
        weightScore: Prisma.Decimal | null;
      }
    >();

    for (const item of sourcePosts) {
      const archivedPostId = item.archivedPostId.trim();

      if (archivedPostId.length === 0) {
        continue;
      }

      normalizedSourcePosts.set(archivedPostId, {
        archivedPostId,
        weightScore: this.normalizeWeightScore(item.weightScore),
      });
    }

    return [...normalizedSourcePosts.values()];
  }

  private normalizeWeightScore(
    value?: Prisma.Decimal | number | string | null,
  ) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const numericValue =
      value instanceof Prisma.Decimal
        ? Number(value.toString())
        : Number(value);

    if (!Number.isFinite(numericValue)) {
      throw new BadRequestException('Report source weight score is invalid');
    }

    return new Prisma.Decimal(numericValue);
  }

  private async ensureSourcePostsAvailable(
    userId: string,
    archivedPostIds: string[],
  ) {
    if (archivedPostIds.length === 0) {
      return;
    }

    const availablePosts = await this.prisma.archivedPost.findMany({
      where: {
        id: {
          in: archivedPostIds,
        },
        binding: {
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (availablePosts.length !== archivedPostIds.length) {
      throw new BadRequestException('One or more source posts are unavailable');
    }
  }
}
