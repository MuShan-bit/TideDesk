import { Type } from 'class-transformer';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';

export class UpdateCrawlConfigDto {
  @IsBoolean()
  crawlEnabled!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  crawlIntervalMinutes!: number;
}
