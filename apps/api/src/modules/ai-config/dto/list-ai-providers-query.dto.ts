import { AIProviderType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import {
  toOptionalBoolean,
  trimOptionalString,
} from './ai-config-dto.helpers';

export class ListAiProvidersQueryDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  includeDisabled?: boolean;

  @IsOptional()
  @IsEnum(AIProviderType)
  providerType?: AIProviderType;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  keyword?: string;
}

