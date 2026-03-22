import { Transform } from 'class-transformer';
import { IsOptional, IsString, MinLength } from 'class-validator';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class UpdatePublishChannelBindingDto {
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  accountIdentifier?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  @MinLength(2)
  credentialPayload?: string;
}
