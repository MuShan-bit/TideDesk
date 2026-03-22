import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

function trimOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function toOptionalStringArray(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const values = Array.isArray(value)
    ? value.flatMap((item) =>
        typeof item === 'string' ? item.split(',') : [String(item)],
      )
    : typeof value === 'string'
      ? value.split(',')
      : [String(value)];

  const normalizedValues = values
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return normalizedValues.length > 0 ? normalizedValues : undefined;
}

export class CreatePublishDraftDto {
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  reportId?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsArray()
  @IsString({ each: true })
  archivedPostIds?: string[];

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  @MinLength(1)
  summary?: string;
}
