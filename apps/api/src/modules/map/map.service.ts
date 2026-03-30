import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type CreateAreaRequest,
  type CreateAreaResponse,
  type DeleteAreaResponse,
  type GeoJsonFeatureCollection,
  type GeoJsonGeometry,
  type RanchBoundary,
  type RanchGeometryProperties,
  type UpdateAreaDetailsRequest,
  type UpdateAreaDetailsResponse,
  type UpdateAreaGeometryRequest,
  type UpdateAreaGeometryResponse,
  type UpdateAreaMetricsRequest,
  type UpdateAreaMetricsResponse,
  type UpdateZoneGeometryRequest,
  type UpdateZoneGeometryResponse,
  type ZoneSummary,
} from '@bakki/domain';
import { BakkiAreaMetricsService } from '../../bakki-core/bakki-area-metrics.service';
import { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';
import { BakkiMapAuditService } from '../../bakki-core/bakki-map-audit.service';
import { BakkiPhaseService } from '../../bakki-core/bakki-phase.service';
import { BakkiSpeciesService } from '../../bakki-core/bakki-species.service';
import { validateGeoJsonGeometry } from '../../common/validation';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import {
  capitalizeGeometryUpdateDescription,
  extractFirstLinearRing,
  formatBoundaryCoordinates,
  type GeometryUpdatePersistence,
  isBakkiCoreConnectivityError,
  isPolygonGeometry,
} from './map.service.helpers';
import { updateAreaMetrics as updateAreaMetricsMutation } from './map.service.metrics';
import {
  buildMapManagementData,
  buildMapViewerData,
} from './map.service.data';

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly bakkiAreaMetrics: BakkiAreaMetricsService,
    private readonly bakkiGeometry: BakkiGeometryService,
    private readonly bakkiMapAudit: BakkiMapAuditService,
    private readonly bakkiPhases: BakkiPhaseService,
    private readonly bakkiSpecies: BakkiSpeciesService,
  ) {}

  async getRanchBoundary() {
    return this.bakkiGeometry.getRanchBoundarySummary() satisfies Promise<RanchBoundary>;
  }

  async listZones() {
    return this.bakkiGeometry.listZoneSummaries() satisfies Promise<ZoneSummary[]>;
  }

  async getRanchGeometryFeatureCollection() {
    return this.bakkiGeometry.getRanchGeometryFeatureCollection() satisfies Promise<
      GeoJsonFeatureCollection<RanchGeometryProperties>
    >;
  }

  async getZoneGeometryFeatureCollection() {
    return this.bakkiGeometry.getZoneGeometryFeatureCollection();
  }

  async getAreaGeometryFeatureCollection() {
    return this.bakkiGeometry.getAreaGeometryFeatureCollection();
  }

  async listMapAudit() {
    return {
      events: await this.bakkiMapAudit.listRecent(50),
    };
  }

  async updateAreaGeometry(
    areaId: string,
    input: UpdateAreaGeometryRequest,
    sessionToken?: string,
  ): Promise<UpdateAreaGeometryResponse> {
    this.assertEditablePolygonGeometry('Area', input.geometry);
    this.assertGeometryBackendAvailable('Bakki Core area geometry is unavailable.');

    const actor = await this.authService.requireSessionActor(sessionToken);
    const areaCatalog = await this.bakkiGeometry.getAreasByRefs([areaId]);
    const area = areaCatalog.get(areaId);
    if (!area) {
      throw new BadRequestException('Editable area not found.');
    }

    const boundaryCoordinates = formatBoundaryCoordinates(input.geometry.coordinates);
    const { persistence, updatedAt } = await this.persistGeometryUpdate({
      description: 'area geometry update',
      unavailableMessage: 'Bakki Core area geometry is unavailable.',
      writeToBakkiCore: async () => {
        await this.bakkiGeometry.importAreaGeometry([
          {
            areaRef: areaId,
            geometry: input.geometry,
            name: area.areaName,
            zoneRef: area.zoneRef,
          },
        ]);

        return new Date().toISOString();
      },
    });

    await this.recordGeometryUpdate({
      actorUserId: actor.session.user.id,
      boundaryCoordinates,
      changeSummary: `Updated geometry for ${area.areaName}`,
      entityRef: area.areaRef,
      entityType: 'area_geometry',
      eventMessage: `Updated area geometry for ${area.areaName}`,
      persistence,
      profileId: actor.profileId ?? null,
      targetModel: 'bakki_area',
      type: 'area.geometry_update',
      zoneId: area.zoneRef,
    });

    return {
      areaId: area.areaRef,
      areaName: area.areaName,
      boundaryCoordinates,
      geometry: input.geometry,
      persistence,
      updatedAt,
      zoneId: area.zoneRef,
    };
  }

  async createArea(
    input: CreateAreaRequest,
    sessionToken?: string,
  ): Promise<CreateAreaResponse> {
    this.assertEditablePolygonGeometry('Area', input.geometry);
    this.assertGeometryBackendAvailable('Bakki Core area geometry is unavailable.');

    const zoneId = input.zoneId.trim();
    if (!zoneId) {
      throw new BadRequestException('Select a zone before creating an area.');
    }

    const areaName = this.normalizeAreaName(input.name);
    const actor = await this.authService.requireSessionActor(sessionToken);
    const zone = (await this.listZones()).find((candidate) => candidate.id === zoneId);
    if (!zone) {
      throw new BadRequestException('Parent zone not found.');
    }

    const areaCatalog = await this.bakkiGeometry.listAreas();
    const areaId = this.generateAreaRef(zoneId, areaName, areaCatalog);
    const boundaryCoordinates = formatBoundaryCoordinates(input.geometry.coordinates);
    const { persistence, updatedAt } = await this.persistGeometryUpdate({
      description: 'area creation',
      unavailableMessage: 'Bakki Core area geometry is unavailable.',
      writeToBakkiCore: async () => {
        await this.bakkiGeometry.importAreaGeometry([
          {
            areaRef: areaId,
            geometry: input.geometry,
            name: areaName,
            sourceFeatureName: 'Map Management',
            sourceFileName: 'map-management',
            zoneRef: zoneId,
          },
        ]);

        return new Date().toISOString();
      },
    });

    await this.recordAreaCatalogChange({
      actorUserId: actor.session.user.id,
      areaName,
      changeSummary: `Created area ${areaName}`,
      diffPayload: {
        boundaryCoordinates,
        persistence,
        zoneId,
      },
      entityRef: areaId,
      eventMessage: `Created area ${areaName}`,
      profileId: actor.profileId ?? null,
      targetModel: 'bakki_area',
      type: 'area.create',
      zoneId,
    });

    return {
      areaId,
      areaName,
      boundaryCoordinates,
      geometry: input.geometry,
      persistence,
      updatedAt,
      zoneId,
    };
  }

  async updateAreaDetails(
    areaId: string,
    input: UpdateAreaDetailsRequest,
    sessionToken?: string,
  ): Promise<UpdateAreaDetailsResponse> {
    this.assertGeometryBackendAvailable('Bakki Core area management is unavailable.');

    const actor = await this.authService.requireSessionActor(sessionToken);
    const areaCatalog = await this.bakkiGeometry.getAreasByRefs([areaId]);
    const area = areaCatalog.get(areaId);
    if (!area) {
      throw new BadRequestException('Editable area not found.');
    }

    const areaName = this.normalizeAreaName(input.name);
    const speciesRef =
      input.speciesRef === undefined
        ? area.assignedSpeciesRef ?? null
        : input.speciesRef?.trim() || null;
    const result = await this.runBakkiCoreMutation({
      description: 'area details update',
      unavailableMessage: 'Bakki Core area management is unavailable.',
      run: () => this.bakkiGeometry.updateAreaDetails(areaId, areaName, speciesRef),
    });

    await this.recordAreaCatalogChange({
      actorUserId: actor.session.user.id,
      areaName: result.areaName,
      changeSummary: `Updated area details for ${result.areaName}`,
      diffPayload: {
        speciesRef: result.speciesRef,
        zoneId: result.zoneRef,
      },
      entityRef: result.areaRef,
      eventMessage: `Updated area details for ${result.areaName}`,
      profileId: actor.profileId ?? null,
      targetModel: 'bakki_area',
      type: 'area.details_update',
      zoneId: result.zoneRef,
    });

    return {
      areaId: result.areaRef,
      areaName: result.areaName,
      speciesRef: result.speciesRef,
      updatedAt: result.updatedAt,
      zoneId: result.zoneRef,
    };
  }

  async deleteArea(
    areaId: string,
    sessionToken?: string,
  ): Promise<DeleteAreaResponse> {
    this.assertGeometryBackendAvailable('Bakki Core area management is unavailable.');

    const actor = await this.authService.requireSessionActor(sessionToken);
    const result = await this.runBakkiCoreMutation({
      description: 'area deletion',
      unavailableMessage: 'Bakki Core area management is unavailable.',
      run: () => this.bakkiGeometry.deleteArea(areaId),
    }).catch((error) => {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Area deletion could not be completed.';
      if (message.includes('cannot be deleted')) {
        throw new ConflictException(message);
      }

      throw error;
    });

    await this.recordAreaCatalogChange({
      actorUserId: actor.session.user.id,
      areaName: result.areaName,
      changeSummary: `Deleted area ${result.areaName}`,
      diffPayload: {
        zoneId: result.zoneRef,
      },
      entityRef: result.areaRef,
      eventMessage: `Deleted area ${result.areaName}`,
      profileId: actor.profileId ?? null,
      targetModel: 'bakki_area',
      type: 'area.delete',
      zoneId: result.zoneRef,
    });

    return {
      areaId: result.areaRef,
      areaName: result.areaName,
      deletedAt: result.deletedAt,
      zoneId: result.zoneRef,
    };
  }

  async updateZoneGeometry(
    zoneId: string,
    input: UpdateZoneGeometryRequest,
    sessionToken?: string,
  ): Promise<UpdateZoneGeometryResponse> {
    this.assertEditablePolygonGeometry('Zone', input.geometry);
    this.assertGeometryBackendAvailable('Bakki Core zone geometry is unavailable.');

    const actor = await this.authService.requireSessionActor(sessionToken);
    const zone = (await this.listZones()).find((candidate) => candidate.id === zoneId);
    if (!zone) {
      throw new BadRequestException('Editable zone not found.');
    }

    const boundaryCoordinates = formatBoundaryCoordinates(input.geometry.coordinates);
    const { persistence, updatedAt } = await this.persistGeometryUpdate({
      description: 'zone geometry update',
      unavailableMessage: 'Bakki Core zone geometry is unavailable.',
      writeToBakkiCore: async () => {
        const result = await this.bakkiGeometry.updateZoneGeometry(zoneId, input.geometry);
        return result.updatedAt;
      },
    });

    await this.recordGeometryUpdate({
      actorUserId: actor.session.user.id,
      boundaryCoordinates,
      changeSummary: `Updated geometry for ${zone.name}`,
      entityRef: zoneId,
      entityType: 'zone_geometry',
      eventMessage: `Updated zone geometry for ${zone.name}`,
      persistence,
      profileId: actor.profileId ?? null,
      targetModel: 'bakki_zone',
      type: 'zone.geometry_update',
      zoneId,
    });

    return {
      boundaryCoordinates,
      geometry: input.geometry,
      persistence,
      updatedAt,
      zoneId,
      zoneName: zone.name,
    };
  }

  async getViewerData() {
    return buildMapViewerData({
      bakkiAreaMetrics: this.bakkiAreaMetrics,
      bakkiGeometry: this.bakkiGeometry,
      bakkiPhases: this.bakkiPhases,
      bakkiSpecies: this.bakkiSpecies,
      getRanchBoundary: () => this.getRanchBoundary(),
      listZones: () => this.listZones(),
      logger: this.logger,
    });
  }

  async getManagementData() {
    return buildMapManagementData({
      bakkiAreaMetrics: this.bakkiAreaMetrics,
      bakkiGeometry: this.bakkiGeometry,
      bakkiPhases: this.bakkiPhases,
      listZones: () => this.listZones(),
      logger: this.logger,
    });
  }

  async updateAreaMetrics(
    areaId: string,
    input: UpdateAreaMetricsRequest,
    sessionToken?: string,
  ): Promise<UpdateAreaMetricsResponse> {
    return updateAreaMetricsMutation({
      auditService: this.auditService,
      authService: this.authService,
      bakkiAreaMetrics: this.bakkiAreaMetrics,
      bakkiMapAudit: this.bakkiMapAudit,
      logger: this.logger,
    }, areaId, input, sessionToken);
  }

  private assertEditablePolygonGeometry(kind: 'Area' | 'Zone', geometry: GeoJsonGeometry) {
    // Full GeoJSON validation including coordinate bounds and structure
    validateGeoJsonGeometry(geometry as { type: string; coordinates: unknown }, ['Polygon', 'MultiPolygon']);

    if (!isPolygonGeometry(geometry)) {
      throw new BadRequestException(`${kind} geometry must be a GeoJSON Polygon or MultiPolygon.`);
    }

    if (extractFirstLinearRing(geometry.coordinates).length < 4) {
      throw new BadRequestException(`${kind} geometry must include at least four boundary points.`);
    }
  }

  private assertGeometryBackendAvailable(message: string) {
    if (!this.bakkiGeometry.isConfigured()) {
      throw new ServiceUnavailableException(message);
    }
  }

  private normalizeAreaName(value: string) {
    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException('Area name is required.');
    }

    return normalized;
  }

  private generateAreaRef(
    zoneId: string,
    areaName: string,
    areaCatalog: Map<string, { areaName: string; areaRef: string; zoneRef: string }>,
  ) {
    const base = `${zoneId}-${this.slugify(areaName)}`.replace(/-+/g, '-');
    let candidate = base;
    let suffix = 2;

    while (areaCatalog.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'area';
  }

  private async runBakkiCoreMutation<T>(options: {
    description: string;
    unavailableMessage: string;
    run: () => Promise<T>;
  }): Promise<T> {
    try {
      return await options.run();
    } catch (error) {
      const detail = error instanceof Error ? error.message : `Unknown ${options.description} error`;
      if (isBakkiCoreConnectivityError(detail)) {
        this.logger.warn(`Bakki Core ${options.description} unavailable. ${detail}`);
        throw new ServiceUnavailableException(options.unavailableMessage);
      }

      this.logger.error(`${capitalizeGeometryUpdateDescription(options.description)} failed: ${detail}`);
      throw new BadRequestException(
        detail || `${capitalizeGeometryUpdateDescription(options.description)} could not be completed.`,
      );
    }
  }

  private async persistGeometryUpdate(options: {
    description: string;
    unavailableMessage: string;
    writeToBakkiCore: () => Promise<string>;
  }): Promise<{
    persistence: GeometryUpdatePersistence;
    updatedAt: string;
  }> {
    return {
      persistence: 'bakki-core',
      updatedAt: await this.runBakkiCoreMutation({
        description: options.description,
        unavailableMessage: options.unavailableMessage,
        run: options.writeToBakkiCore,
      }),
    };
  }

  private async recordGeometryUpdate(options: {
    actorUserId: string;
    boundaryCoordinates: string[];
    changeSummary: string;
    entityRef: string;
    entityType: 'area_geometry' | 'zone_geometry';
    eventMessage: string;
    persistence: GeometryUpdatePersistence;
    profileId: number | null;
    targetModel: string;
    type: 'area.geometry_update' | 'zone.geometry_update';
    zoneId: string;
  }) {
    const payload = {
      boundaryCoordinates: options.boundaryCoordinates,
      persistence: options.persistence,
      zoneId: options.zoneId,
    };

    await this.auditService.recordEvent({
      actor: options.actorUserId,
      message: options.eventMessage,
      payload,
      targetModel: options.targetModel,
      type: options.type,
    });
    await this.bakkiMapAudit.create({
      editorUserId: options.profileId,
      entityType: options.entityType,
      entityRef: options.entityRef,
      changeType: 'geometry_update',
      changeSummary: options.changeSummary,
      diffPayload: payload,
    });
  }

  private async recordAreaCatalogChange(options: {
    actorUserId: string;
    areaName: string;
    changeSummary: string;
    diffPayload: Record<string, unknown>;
    entityRef: string;
    eventMessage: string;
    profileId: number | null;
    targetModel: string;
    type: 'area.create' | 'area.delete' | 'area.details_update';
    zoneId: string;
  }) {
    await this.auditService.recordEvent({
      actor: options.actorUserId,
      message: options.eventMessage,
      payload: {
        ...options.diffPayload,
        areaName: options.areaName,
      },
      targetModel: options.targetModel,
      type: options.type,
    });

    await this.bakkiMapAudit.create({
      changeSummary: options.changeSummary,
      changeType:
        options.type === 'area.create'
          ? 'create'
          : options.type === 'area.delete'
            ? 'delete'
            : 'details_update',
      diffPayload: {
        ...options.diffPayload,
        areaName: options.areaName,
        zoneId: options.zoneId,
      },
      editorUserId: options.profileId,
      entityRef: options.entityRef,
      entityType: 'area',
    });
  }
}
