import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { RecordMonitoringResultRequest } from '@bakki/domain';

export class RecordMonitoringResultDto implements RecordMonitoringResultRequest {
  @IsOptional()
  @IsString()
  areaId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  densityPer100Sqm!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  treeCount?: number;

  @IsOptional()
  @IsDateString()
  observedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  sampledAreaSqm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  meanHeightM?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  meanDiameterCm?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
