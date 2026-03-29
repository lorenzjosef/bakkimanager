import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { GeoJsonGeometry, UpdateAreaGeometryRequest } from '@bakki/domain';

class GeoJsonGeometryDto implements GeoJsonGeometry {
  @IsString()
  type!: string;

  @IsArray()
  coordinates!: unknown;
}

export class UpdateAreaGeometryDto implements UpdateAreaGeometryRequest {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => GeoJsonGeometryDto)
  geometry!: GeoJsonGeometryDto;
}
