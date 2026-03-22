import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.type';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { serializeForJson } from '../../common/utils/json-serializer';
import { CreatePublishDraftDto } from './dto/create-publish-draft.dto';
import { ListPublishDraftsQueryDto } from './dto/list-publish-drafts-query.dto';
import { PublishingDraftsService } from './publishing-drafts.service';

@Controller('publishing/drafts')
@UseGuards(InternalAuthGuard)
export class PublishingDraftsController {
  constructor(
    private readonly publishingDraftsService: PublishingDraftsService,
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
}
