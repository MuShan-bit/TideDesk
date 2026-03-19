import { type CrawlActionType, type Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateCrawlRunPostInput = {
  actionType: CrawlActionType;
  archivedPostId?: string | null;
  crawlRunId: string;
  rawPayloadJson?: Prisma.InputJsonValue;
  reason?: string | null;
  xPostId: string;
};

@Injectable()
export class CrawlRunPostsService {
  constructor(private readonly prisma: PrismaService) {}

  createRecord(input: CreateCrawlRunPostInput) {
    return this.prisma.crawlRunPost.create({
      data: {
        crawlRunId: input.crawlRunId,
        xPostId: input.xPostId,
        archivedPostId: input.archivedPostId ?? null,
        actionType: input.actionType,
        reason: input.reason ?? null,
        rawPayloadJson: input.rawPayloadJson,
      },
      include: {
        archivedPost: true,
      },
    });
  }

  listByRunId(crawlRunId: string) {
    return this.prisma.crawlRunPost.findMany({
      where: { crawlRunId },
      include: {
        archivedPost: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
