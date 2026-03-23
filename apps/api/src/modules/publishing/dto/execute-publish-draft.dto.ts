import { IsOptional, IsString } from 'class-validator';

export class ExecutePublishDraftDto {
  @IsOptional()
  @IsString()
  channelBindingId?: string;
}
