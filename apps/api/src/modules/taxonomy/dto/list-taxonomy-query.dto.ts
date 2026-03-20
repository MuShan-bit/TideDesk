import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import {
  toOptionalBoolean,
  trimOptionalString,
} from './taxonomy-dto.helpers';

export class ListTaxonomyQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimOptionalString(value))
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  includeInactive?: boolean;
}
