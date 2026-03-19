import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.type';
import { serializeForJson } from '../../common/utils/json-serializer';
import { ArchivesService } from './archives.service';

@Controller('archives')
@UseGuards(InternalAuthGuard)
export class ArchivesController {
  constructor(private readonly archivesService: ArchivesService) {}

  @Get()
  listArchives(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.archivesService
      .listArchivedPostsByUser(user.id, {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
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
