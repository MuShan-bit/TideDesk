import { AITaskType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  toOptionalBoolean,
  trimRequiredString,
} from './ai-config-dto.helpers';

export class CreateAiModelDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  providerConfigId!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  modelCode!: string;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsEnum(AITaskType)
  taskType!: AITaskType;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  parametersJson?: Record<string, unknown> | null;
}

