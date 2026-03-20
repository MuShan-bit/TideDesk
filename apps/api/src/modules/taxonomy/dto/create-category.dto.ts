import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  normalizeOptionalText,
  toOptionalBoolean,
  toOptionalInt,
  trimOptionalString,
  trimRequiredString,
} from './taxonomy-dto.helpers';

export class CreateCategoryDto {
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  slug?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsString()
  description?: string | null;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsHexColor()
  color?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalInt(value))
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
