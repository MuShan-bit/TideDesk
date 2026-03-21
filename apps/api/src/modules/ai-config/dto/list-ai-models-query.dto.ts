import { AITaskType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import {
  toOptionalBoolean,
  trimOptionalString,
} from './ai-config-dto.helpers';

export class ListAiModelsQueryDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  includeDisabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  providerConfigId?: string;

  @IsOptional()
  @IsEnum(AITaskType)
  taskType?: AITaskType;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  keyword?: string;
}

