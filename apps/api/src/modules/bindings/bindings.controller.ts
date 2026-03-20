import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import type { RequestUser } from '../../common/auth/request-user.type';
import { BindingsService } from './bindings.service';
import { serializeForJson } from '../../common/utils/json-serializer';
import { CreateCrawlProfileDto } from './dto/create-crawl-profile.dto';
import { UpsertBindingDto } from './dto/upsert-binding.dto';
import { UpdateCrawlProfileDto } from './dto/update-crawl-profile.dto';
import { UpdateCrawlConfigDto } from './dto/update-crawl-config.dto';

@Controller('bindings')
@UseGuards(InternalAuthGuard)
export class BindingsController {
  constructor(private readonly bindingsService: BindingsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.bindingsService
      .listForUser(user.id)
      .then((payload) => serializeForJson(payload));
  }

  @Get('current')
  getCurrent(@CurrentUser() user: RequestUser) {
    return this.bindingsService
      .getCurrent(user.id)
      .then((payload) => serializeForJson(payload));
  }

  @Post()
  upsert(@CurrentUser() user: RequestUser, @Body() dto: UpsertBindingDto) {
    return this.bindingsService
      .upsertForUser(user.id, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Patch(':id/crawl-config')
  updateCrawlConfig(
    @CurrentUser() user: RequestUser,
    @Param('id') bindingId: string,
    @Body() dto: UpdateCrawlConfigDto,
  ) {
    return this.bindingsService
      .updateCrawlConfig(user.id, bindingId, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Get(':id/crawl-profiles')
  listCrawlProfiles(
    @CurrentUser() user: RequestUser,
    @Param('id') bindingId: string,
  ) {
    return this.bindingsService
      .listCrawlProfiles(user.id, bindingId)
      .then((payload) => serializeForJson(payload));
  }

  @Post(':id/crawl-profiles')
  createCrawlProfile(
    @CurrentUser() user: RequestUser,
    @Param('id') bindingId: string,
    @Body() dto: CreateCrawlProfileDto,
  ) {
    return this.bindingsService
      .createCrawlProfile(user.id, bindingId, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Patch(':id/crawl-profiles/:profileId')
  updateCrawlProfile(
    @CurrentUser() user: RequestUser,
    @Param('id') bindingId: string,
    @Param('profileId') profileId: string,
    @Body() dto: UpdateCrawlProfileDto,
  ) {
    return this.bindingsService
      .updateCrawlProfile(user.id, bindingId, profileId, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Post(':id/validate')
  revalidate(@CurrentUser() user: RequestUser, @Param('id') bindingId: string) {
    return this.bindingsService
      .revalidate(user.id, bindingId)
      .then((payload) => serializeForJson(payload));
  }

  @Post(':id/disable')
  disable(@CurrentUser() user: RequestUser, @Param('id') bindingId: string) {
    return this.bindingsService
      .disable(user.id, bindingId)
      .then((payload) => serializeForJson(payload));
  }

  @Post(':id/unbind')
  unbind(@CurrentUser() user: RequestUser, @Param('id') bindingId: string) {
    return this.bindingsService
      .unbind(user.id, bindingId)
      .then((payload) => serializeForJson(payload));
  }

  @Post(':id/crawl-now')
  triggerManualCrawl(
    @CurrentUser() user: RequestUser,
    @Param('id') bindingId: string,
  ) {
    return this.bindingsService
      .triggerManualCrawl(user.id, bindingId)
      .then((payload) => serializeForJson(payload));
  }
}
