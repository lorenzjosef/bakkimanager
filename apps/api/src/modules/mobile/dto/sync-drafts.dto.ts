import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  CaptureMethod,
  CapturedPoint,
  DraftDeviceInfo,
  GeoJsonGeometry,
  MobileDraftPayload,
  MobileSyncDraftsRequest,
} from '@bakki/domain';

export class CapturedPointDto implements CapturedPoint {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsNumber()
  @Min(0)
  accuracy!: number;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;
}

export class DeviceInfoDto implements DraftDeviceInfo {
  @IsString()
  platform!: 'ios' | 'android';

  @IsString()
  osVersion!: string;

  @IsString()
  appVersion!: string;
}

export class GeoJsonGeometryDto implements GeoJsonGeometry {
  @IsString()
  @IsIn(['Polygon', 'MultiPolygon'])
  type!: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';

  @IsArray()
  coordinates!: unknown;
}

export class MobileDraftPayloadDto implements MobileDraftPayload {
  @IsString()
  @IsNotEmpty()
  localId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  zoneId!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => GeoJsonGeometryDto)
  geometry!: GeoJsonGeometryDto;

  @IsArray()
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => CapturedPointDto)
  rawCapturePoints!: CapturedPointDto[];

  @IsString()
  @IsNotEmpty()
  captureMethod!: CaptureMethod;

  @IsNumber()
  @Min(0)
  averageGpsAccuracy!: number;

  @IsObject()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo!: DeviceInfoDto;
}

export class SyncDraftsDto implements MobileSyncDraftsRequest {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MobileDraftPayloadDto)
  drafts!: MobileDraftPayloadDto[];
}
