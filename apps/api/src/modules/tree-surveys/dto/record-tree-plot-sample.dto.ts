import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  GeoJsonGeometry,
  RecordTreePlotSampleRequest,
  TreeSizeDistributionBin,
} from '@bakki/domain';

class GeoJsonGeometryDto implements GeoJsonGeometry {
  @IsString()
  type!: string;

  @IsArray()
  coordinates!: unknown;
}

class TreeSizeDistributionBinDto implements TreeSizeDistributionBin {
  @IsString()
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minValue?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxValue?: number | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  treeCount!: number;
}

export class RecordTreePlotSampleDto implements RecordTreePlotSampleRequest {
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
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  sampledAreaSqm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  meanHeightM?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  meanDiameterCm?: number | null;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GeoJsonGeometryDto)
  sampleGeometry?: GeoJsonGeometryDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TreeSizeDistributionBinDto)
  sizeDistribution?: TreeSizeDistributionBinDto[] | null;

  @IsOptional()
  @IsString()
  taskRef?: string | null;

  @IsOptional()
  @IsString()
  sampledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
