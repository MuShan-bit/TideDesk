import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.type';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { serializeForJson } from '../../common/utils/json-serializer';
import { CreatePublishDraftDto } from './dto/create-publish-draft.dto';
import { ExecutePublishDraftDto } from './dto/execute-publish-draft.dto';
import { ListPublishDraftsQueryDto } from './dto/list-publish-drafts-query.dto';
import { UpdatePublishDraftDto } from './dto/update-publish-draft.dto';
import { PublishingDraftsService } from './publishing-drafts.service';
import { PublishingJobsService } from './publishing-jobs.service';

@Controller('publishing/drafts')
@UseGuards(InternalAuthGuard)
export class PublishingDraftsController {
  constructor(
    private readonly publishingDraftsService: PublishingDraftsService,
    private readonly publishingJobsService: PublishingJobsService,
  ) {}

  @Get()
  listPublishDrafts(
    @CurrentUser() user: RequestUser,
    @Query() query: ListPublishDraftsQueryDto,
  ) {
    return this.publishingDraftsService
      .listPublishDrafts(user.id, query)
      .then((payload) => serializeForJson(payload));
  }

  @Get(':id')
  getPublishDraft(
    @CurrentUser() user: RequestUser,
    @Param('id') draftId: string,
  ) {
    return this.publishingDraftsService
      .getPublishDraft(user.id, draftId)
      .then((payload) => serializeForJson(payload));
  }

  @Post()
  createPublishDraft(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePublishDraftDto,
  ) {
    return this.publishingDraftsService
      .createPublishDraft(user.id, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Patch(':id')
  updatePublishDraft(
    @CurrentUser() user: RequestUser,
    @Param('id') draftId: string,
    @Body() dto: UpdatePublishDraftDto,
  ) {
    return this.publishingDraftsService
      .updatePublishDraft(user.id, draftId, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Post(':id/publish')
  publishDraft(
    @CurrentUser() user: RequestUser,
    @Param('id') draftId: string,
    @Body() dto: ExecutePublishDraftDto,
  ) {
    return this.publishingJobsService
      .publishDraft(user.id, draftId, dto)
      .then((payload) => serializeForJson(payload));
  }
}
