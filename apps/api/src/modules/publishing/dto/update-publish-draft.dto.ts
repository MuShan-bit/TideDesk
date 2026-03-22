import { Transform } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function toOptionalStringArray(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value) && value.length === 0) {
    return [];
  }

  const values = Array.isArray(value)
    ? value.flatMap((item) =>
        typeof item === 'string' ? item.split(',') : [String(item)],
      )
    : typeof value === 'string'
      ? value.split(',')
      : [String(value)];

  return values.map((item) => item.trim()).filter((item) => item.length > 0);
}

export class UpdatePublishDraftDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  summary?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  bodyText?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsArray()
  @IsString({ each: true })
  targetChannelIds?: string[];
}
