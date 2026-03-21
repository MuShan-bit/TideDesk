import { AIProviderType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import {
  normalizeOptionalText,
  toOptionalBoolean,
  trimRequiredString,
} from './ai-config-dto.helpers';

export class CreateAiProviderDto {
  @IsEnum(AIProviderType)
  providerType!: AIProviderType;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsUrl({
    require_protocol: true,
    require_tld: false,
  })
  baseUrl?: string | null;

  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  apiKey!: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  enabled?: boolean;
}

