import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { getRequestSessionToken } from '../auth/auth.service';
import { MapService } from './map.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDetailsDto } from './dto/update-area-details.dto';
import { UpdateAreaGeometryDto } from './dto/update-area-geometry.dto';
import { UpdateAreaMetricsDto } from './dto/update-area-metrics.dto';
import { UpdateZoneGeometryDto } from './dto/update-zone-geometry.dto';

@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('ranch')
  getRanchBoundary() {
    return this.mapService.getRanchBoundary();
  }

  @Get('ranch/geometry')
  getRanchGeometry() {
    return this.mapService.getRanchGeometryFeatureCollection();
  }

  @Get('zones')
  async listZones() {
    return {
      zones: await this.mapService.listZones(),
    };
  }

  @Get('zones/geometry')
  getZoneGeometry() {
    return this.mapService.getZoneGeometryFeatureCollection();
  }

  @Get('areas/geometry')
  getAreaGeometry() {
    return this.mapService.getAreaGeometryFeatureCollection();
  }

  @Get('viewer')
  getViewerData() {
    return this.mapService.getViewerData();
  }

  @Get('management')
  getManagementData() {
    return this.mapService.getManagementData();
  }

  @Get('audit')
  listMapAudit() {
    return this.mapService.listMapAudit();
  }

  @Post('areas')
  createArea(
    @Body() body: CreateAreaDto,
    @Req() request: Request,
  ) {
    return this.mapService.createArea(
      body,
      getRequestSessionToken(request),
    );
  }

  @Patch('areas/:areaId/geometry')
  updateAreaGeometry(
    @Param('areaId') areaId: string,
    @Body() body: UpdateAreaGeometryDto,
    @Req() request: Request,
  ) {
    return this.mapService.updateAreaGeometry(
      areaId,
      body,
      getRequestSessionToken(request),
    );
  }

  @Patch('zones/:zoneId/geometry')
  updateZoneGeometry(
    @Param('zoneId') zoneId: string,
    @Body() body: UpdateZoneGeometryDto,
    @Req() request: Request,
  ) {
    return this.mapService.updateZoneGeometry(
      zoneId,
      body,
      getRequestSessionToken(request),
    );
  }

  @Patch('areas/:areaId/details')
  updateAreaDetails(
    @Param('areaId') areaId: string,
    @Body() body: UpdateAreaDetailsDto,
    @Req() request: Request,
  ) {
    return this.mapService.updateAreaDetails(
      areaId,
      body,
      getRequestSessionToken(request),
    );
  }

  @Patch('areas/:areaId/metrics')
  updateAreaMetrics(
    @Param('areaId') areaId: string,
    @Body() body: UpdateAreaMetricsDto,
    @Req() request: Request,
  ) {
    return this.mapService.updateAreaMetrics(
      areaId,
      body,
      getRequestSessionToken(request),
    );
  }

  @Delete('areas/:areaId')
  deleteArea(
    @Param('areaId') areaId: string,
    @Req() request: Request,
  ) {
    return this.mapService.deleteArea(
      areaId,
      getRequestSessionToken(request),
    );
  }
}
