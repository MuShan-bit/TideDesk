import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  normalizeOptionalText,
  toOptionalBoolean,
  trimOptionalString,
  trimRequiredString,
} from './taxonomy-dto.helpers';

export class UpdateTagDto {
  @IsOptional()
  @Transform(({ value }) => trimRequiredString(value))
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  slug?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeOptionalText(value))
  @IsHexColor()
  color?: string | null;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  isActive?: boolean;
}
