import { PublishPlatformType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreatePublishChannelBindingDto {
  @IsEnum(PublishPlatformType)
  platformType!: PublishPlatformType;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(1)
  displayName!: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  accountIdentifier?: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(2)
  credentialPayload!: string;
}
