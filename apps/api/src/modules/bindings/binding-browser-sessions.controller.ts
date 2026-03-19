import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.type';
import { serializeForJson } from '../../common/utils/json-serializer';
import { BindingBrowserSessionsService } from './binding-browser-sessions.service';

@Controller('bindings/browser-sessions')
@UseGuards(InternalAuthGuard)
export class BindingBrowserSessionsController {
  constructor(
    private readonly bindingBrowserSessionsService: BindingBrowserSessionsService,
  ) {}

  @Post()
  createSession(@CurrentUser() user: RequestUser) {
    return this.bindingBrowserSessionsService
      .createSessionForUser(user.id)
      .then((payload) => serializeForJson(payload));
  }

  @Get(':id')
  getSession(@CurrentUser() user: RequestUser, @Param('id') sessionId: string) {
    return this.bindingBrowserSessionsService
      .getSessionByIdForUser(user.id, sessionId)
      .then((payload) => serializeForJson(payload));
  }

  @Post(':id/cancel')
  cancelSession(
    @CurrentUser() user: RequestUser,
    @Param('id') sessionId: string,
  ) {
    return this.bindingBrowserSessionsService
      .cancelSessionForUser(user.id, sessionId)
      .then((payload) => serializeForJson(payload));
  }
}
