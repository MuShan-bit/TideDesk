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
import { CreatePublishChannelBindingDto } from './dto/create-publish-channel-binding.dto';
import { ListPublishChannelBindingsQueryDto } from './dto/list-publish-channel-bindings-query.dto';
import { UpdatePublishChannelBindingDto } from './dto/update-publish-channel-binding.dto';
import { PublishingService } from './publishing.service';

@Controller('publishing/channels')
@UseGuards(InternalAuthGuard)
export class PublishingController {
  constructor(private readonly publishingService: PublishingService) {}

  @Get()
  listPublishChannelBindings(
    @CurrentUser() user: RequestUser,
    @Query() query: ListPublishChannelBindingsQueryDto,
  ) {
    return this.publishingService
      .listPublishChannelBindings(user.id, query)
      .then((payload) => serializeForJson(payload));
  }

  @Get(':id')
  getPublishChannelBinding(
    @CurrentUser() user: RequestUser,
    @Param('id') bindingId: string,
  ) {
    return this.publishingService
      .getPublishChannelBinding(user.id, bindingId)
      .then((payload) => serializeForJson(payload));
  }

  @Post()
  createPublishChannelBinding(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePublishChannelBindingDto,
  ) {
    return this.publishingService
      .createPublishChannelBinding(user.id, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Patch(':id')
  updatePublishChannelBinding(
    @CurrentUser() user: RequestUser,
    @Param('id') bindingId: string,
    @Body() dto: UpdatePublishChannelBindingDto,
  ) {
    return this.publishingService
      .updatePublishChannelBinding(user.id, bindingId, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Post(':id/revalidate')
  revalidatePublishChannelBinding(
    @CurrentUser() user: RequestUser,
    @Param('id') bindingId: string,
  ) {
    return this.publishingService
      .revalidatePublishChannelBinding(user.id, bindingId)
      .then((payload) => serializeForJson(payload));
  }

  @Post(':id/disable')
  disablePublishChannelBinding(
    @CurrentUser() user: RequestUser,
    @Param('id') bindingId: string,
  ) {
    return this.publishingService
      .disablePublishChannelBinding(user.id, bindingId)
      .then((payload) => serializeForJson(payload));
  }
}
