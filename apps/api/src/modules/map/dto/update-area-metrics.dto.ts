import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import type { UpdateAreaMetricsRequest } from '@bakki/domain';

export class UpdateAreaMetricsDto implements UpdateAreaMetricsRequest {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  densityPer100Sqm!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  treeCount?: number | null;
}
