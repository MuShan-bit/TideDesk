import { AITaskType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
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
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  parametersJson?: Record<string, unknown> | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  inputTokenPriceUsd?: number | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  outputTokenPriceUsd?: number | null;
}
