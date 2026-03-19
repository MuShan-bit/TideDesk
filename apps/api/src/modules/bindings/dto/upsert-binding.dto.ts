import { CredentialSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertBindingDto {
  @IsString()
  xUserId!: string;

  @IsString()
  username!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsEnum(CredentialSource)
  credentialSource!: CredentialSource;

  @IsString()
  credentialPayload!: string;

  @IsBoolean()
  crawlEnabled!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  crawlIntervalMinutes!: number;
}
