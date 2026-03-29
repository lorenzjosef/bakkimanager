import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { CreateAreaRequest, GeoJsonGeometry } from '@bakki/domain';

class GeoJsonGeometryDto implements GeoJsonGeometry {
  @IsString()
  type!: string;

  @IsArray()
  coordinates!: unknown;
}

export class CreateAreaDto implements CreateAreaRequest {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => GeoJsonGeometryDto)
  geometry!: GeoJsonGeometryDto;

  @IsString()
  name!: string;

  @IsString()
  zoneId!: string;
}
