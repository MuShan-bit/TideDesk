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
import { AiConfigService } from './ai-config.service';
import { CreateAiModelDto } from './dto/create-ai-model.dto';
import { CreateAiProviderDto } from './dto/create-ai-provider.dto';
import { ListAiModelsQueryDto } from './dto/list-ai-models-query.dto';
import { ListAiProvidersQueryDto } from './dto/list-ai-providers-query.dto';
import { UpdateAiModelDto } from './dto/update-ai-model.dto';
import { UpdateAiProviderDto } from './dto/update-ai-provider.dto';

@Controller('ai')
@UseGuards(InternalAuthGuard)
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @Get('providers')
  listProviders(
    @CurrentUser() user: RequestUser,
    @Query() query: ListAiProvidersQueryDto,
  ) {
    return this.aiConfigService
      .listProviders(user.id, query)
      .then((payload) => serializeForJson(payload));
  }

  @Post('providers')
  createProvider(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAiProviderDto,
  ) {
    return this.aiConfigService
      .createProvider(user.id, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Patch('providers/:id')
  updateProvider(
    @CurrentUser() user: RequestUser,
    @Param('id') providerConfigId: string,
    @Body() dto: UpdateAiProviderDto,
  ) {
    return this.aiConfigService
      .updateProvider(user.id, providerConfigId, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Get('models')
  listModels(
    @CurrentUser() user: RequestUser,
    @Query() query: ListAiModelsQueryDto,
  ) {
    return this.aiConfigService
      .listModels(user.id, query)
      .then((payload) => serializeForJson(payload));
  }

  @Post('models')
  createModel(@CurrentUser() user: RequestUser, @Body() dto: CreateAiModelDto) {
    return this.aiConfigService
      .createModel(user.id, dto)
      .then((payload) => serializeForJson(payload));
  }

  @Patch('models/:id')
  updateModel(
    @CurrentUser() user: RequestUser,
    @Param('id') modelConfigId: string,
    @Body() dto: UpdateAiModelDto,
  ) {
    return this.aiConfigService
      .updateModel(user.id, modelConfigId, dto)
      .then((payload) => serializeForJson(payload));
  }
}

