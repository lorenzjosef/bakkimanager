import {
  IsArray,
  IsNumber,
  IsObject,
  IsString,
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
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsNumber()
  accuracy!: number;

  @IsString()
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
  type!: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';

  @IsArray()
  coordinates!: unknown;
}

export class MobileDraftPayloadDto implements MobileDraftPayload {
  @IsString()
  localId!: string;

  @IsString()
  name!: string;

  @IsString()
  zoneId!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => GeoJsonGeometryDto)
  geometry!: GeoJsonGeometryDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapturedPointDto)
  rawCapturePoints!: CapturedPointDto[];

  @IsString()
  captureMethod!: CaptureMethod;

  @IsNumber()
  averageGpsAccuracy!: number;

  @IsObject()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo!: DeviceInfoDto;
}

export class SyncDraftsDto implements MobileSyncDraftsRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MobileDraftPayloadDto)
  drafts!: MobileDraftPayloadDto[];
}
