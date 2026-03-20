import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.type';
import { serializeForJson } from '../../common/utils/json-serializer';
import { ListArchivesQueryDto } from './dto/list-archives-query.dto';
import { ArchivesService } from './archives.service';

function normalizeOptionalQueryNumber(value: number | string | undefined) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return Number(value);
  }

  return undefined;
}

@Controller('archives')
@UseGuards(InternalAuthGuard)
export class ArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  @Get()
  listArchives(
    @CurrentUser() user: RequestUser,
    @Query() query: ListArchivesQueryDto,
  ) {
    return this.archivesService
      .listArchivedPostsByUser(user.id, {
        page: normalizeOptionalQueryNumber(query.page),
        pageSize: normalizeOptionalQueryNumber(query.pageSize),
        categoryId: query.categoryId,
        keyword: query.keyword,
        postType: query.postType,
        tagIds: query.tagIds,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
      })
      .then((payload) => serializeForJson(payload));
  }

  @Get(':id')
  getArchiveDetail(
    @CurrentUser() user: RequestUser,
    @Param('id') archivedPostId: string,
  ) {
    return this.archivesService
      .getArchivedPostDetailForUser(user.id, archivedPostId)
      .then((payload) => serializeForJson(payload));
  }
}
