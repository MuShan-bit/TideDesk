import { Controller, Get, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from '../../common/auth/internal-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user.type';
import { serializeForJson } from '../../common/utils/json-serializer';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(InternalAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: RequestUser) {
    return this.dashboardService
      .getSummary(user.id)
      .then((payload) => serializeForJson(payload));
  }
}
