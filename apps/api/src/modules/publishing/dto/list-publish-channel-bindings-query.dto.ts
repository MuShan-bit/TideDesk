import { PublishBindingStatus, PublishPlatformType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListPublishChannelBindingsQueryDto {
  @IsOptional()
  @IsEnum(PublishPlatformType)
  platformType?: PublishPlatformType;

  @IsOptional()
  @IsEnum(PublishBindingStatus)
  status?: PublishBindingStatus;
}
