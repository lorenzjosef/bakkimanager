import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { CreateTreePlotRequest, GeoJsonGeometry } from '@bakki/domain';

class GeoJsonGeometryDto implements GeoJsonGeometry {
  @IsString()
  type!: string;

  @IsArray()
  coordinates!: unknown;
}

export class CreateTreePlotDto implements CreateTreePlotRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => GeoJsonGeometryDto)
  geometry!: GeoJsonGeometryDto;

  @IsOptional()
  @IsString()
  ranchId?: string;
}
