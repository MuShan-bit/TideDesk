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
import { GetAiUsageSummaryQueryDto } from './dto/get-ai-usage-summary-query.dto';
import { ListAiTaskRecordsQueryDto } from './dto/list-ai-task-records-query.dto';
import { TestAiProviderDto } from './dto/test-ai-provider.dto';
import { AiGatewayService } from './ai-gateway.service';

@Controller('ai')
@UseGuards(InternalAuthGuard)
export class AiGatewayController {
  constructor(private readonly aiGatewayService: AiGatewayService) {}

  @Get('tasks')
  listTasks(
    @CurrentUser() user: RequestUser,
    @Query() query: ListAiTaskRecordsQueryDto,
  ) {
    return this.aiGatewayService
      .listTaskRecords(user.id, query.limit)
      .then((payload) => serializeForJson(payload));
  }

  @Get('usage/summary')
  getUsageSummary(
    @CurrentUser() user: RequestUser,
    @Query() query: GetAiUsageSummaryQueryDto,
  ) {
    return this.aiGatewayService
      .getUsageSummary(user.id, query.days)
      .then((payload) => serializeForJson(payload));
  }

  @Post('providers/:id/test')
  testProvider(
    @CurrentUser() user: RequestUser,
    @Param('id') providerConfigId: string,
    @Body() dto: TestAiProviderDto,
  ) {
    return this.aiGatewayService
      .testProviderConnection(user.id, providerConfigId, dto)
      .then((payload) => serializeForJson(payload));
  }
}
