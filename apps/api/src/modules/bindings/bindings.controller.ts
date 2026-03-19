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
import { UpsertBindingDto } from './dto/upsert-binding.dto';
import { UpdateCrawlConfigDto } from './dto/update-crawl-config.dto';

@Controller('bindings')
@UseGuards(InternalAuthGuard)
export class BindingsController {
  constructor(private readonly bindingsService: BindingsService) {}

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
