import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateCrawlProfileDto {
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
