import { Type } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { GeoJsonGeometry, UpdateTreePlotRequest } from '@bakki/domain';

class GeoJsonGeometryDto implements GeoJsonGeometry {
  @IsString()
  type!: string;

  @IsArray()
  coordinates!: unknown;
}

export class UpdateTreePlotDto implements UpdateTreePlotRequest {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GeoJsonGeometryDto)
  geometry?: GeoJsonGeometryDto;
}
