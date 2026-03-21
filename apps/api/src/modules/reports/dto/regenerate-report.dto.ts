import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

function trimOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

export class RegenerateReportDto {
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  modelConfigId?: string;
}
