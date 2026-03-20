import { CrawlMode } from '@prisma/client';
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

export class CreateCrawlProfileDto {
  @IsEnum(CrawlMode)
  mode!: CrawlMode;

  @IsBoolean()
  enabled!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  intervalMinutes!: number;

  @IsOptional()
  @IsString()
  queryText?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  maxPosts!: number;
}
