import { Injectable, Logger } from '@nestjs/common';
import {
  type AreaGeometryProperties,
  type GeoJsonFeatureCollection,
  type GeoJsonGeometry,
  type GeometryPersistenceSummary,
  type GeometrySeedValidationStatus,
  type RanchBoundary,
  type RanchGeometryProperties,
  type ZoneGeometryProperties,
  type ZoneSummary,
} from '@bakki/domain';
import geometrySeed from '../../../../docs/seeds/geometry-seed.json';
import {
  formatCoordinateLabel,
  type GeometrySeedDocument,
  isZoneOverlapPair,
} from './bakki-geometry.helpers';
import {
  deleteBakkiArea,
  importBakkiAreaGeometry,
  updateBakkiAreaDetails,
  updateBakkiZoneGeometry,
} from './bakki-geometry.mutations';
import { promoteBakkiGeometrySeed } from './bakki-geometry.seed-promotion';
import {
  type BakkiAreaCatalogRecord,
} from './bakki-geometry.reads';
import {
  getAreaGeometryFeatureCollection,
  getAreaGeometrySnapshotByRef,
  getAreasByRefs,
  getPersistedGeometryCounts,
  getRanchBoundarySummary,
  getRanchCentroidCoordinates,
  getRanchGeometryFeatureCollection,
  getZoneBoundaryCoordinateLines,
  getZoneGeometryFeatureCollection,
  listAreas,
  listPersistedZoneRefs,
  listZoneSummaries,
} from './bakki-geometry.read-service';
import { ensureBakkiGeometrySchema } from './bakki-geometry.schema';
import { BakkiCoreService } from './bakki-core.service';
import { allowInvalidGeometrySeedPromotion } from './bakki-core-config';
import { ensureSchemaInitialized } from './schema-init.utils';
export type { CoordinatePoint } from './bakki-geometry.helpers';
export type { BakkiAreaCatalogRecord } from './bakki-geometry.reads';
export type {
  ImportBakkiAreaGeometryInput,
  ImportBakkiAreaGeometryResult,
  ImportBakkiAreaGeometryRow,
  UpdateBakkiZoneGeometryResult,
  DeleteBakkiAreaResult,
  UpdateBakkiAreaDetailsResult,
} from './bakki-geometry.mutations';

@Injectable()
export class BakkiGeometryService {
  private readonly logger = new Logger(BakkiGeometryService.name);
  private readonly seed = geometrySeed as GeometrySeedDocument;
  private schemaEnsured = false;
  private schemaInitPromise: Promise<void> | null = null;

  constructor(private readonly bakkiCore: BakkiCoreService) {}

  isConfigured() {
    return this.bakkiCore.isConfigured();
  }

  async ensureAreaCatalog() {
    if (!this.bakkiCore.isConfigured()) {
      return;
    }

    await this.ensureSchema();
  }

  async promoteSeedGeometry() {
    if (!this.bakkiCore.isConfigured()) {
      return false;
    }

    await this.ensureSchema();

    const validation = this.getSeedValidationStatus();
    if (!validation.promotable && !validation.overrideEnabled) {
      this.logger.warn('Bakki geometry seed promotion skipped because the current seed is not promotable.');
      return false;
    }

    await promoteBakkiGeometrySeed({
      bakkiCore: this.bakkiCore,
      seed: this.seed,
    });

    return true;
  }

  getSeedValidationStatus(): GeometrySeedValidationStatus {
    const validation = this.seed.validation ?? {};
    const containmentFailures = Array.isArray(validation.containment_failures)
      ? validation.containment_failures.filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0,
        )
      : [];
    const overlapPairs = Array.isArray(validation.zone_overlap_pairs)
      ? validation.zone_overlap_pairs.filter(isZoneOverlapPair)
      : [];
    const zonesWithinRanch = validation.zones_within_ranch !== false;
    const overrideEnabled = allowInvalidGeometrySeedPromotion();
    const promotable = zonesWithinRanch && containmentFailures.length === 0 && overlapPairs.length === 0;

    return {
      checkedAt: new Date().toISOString(),
      containmentFailureCount: containmentFailures.length,
      containmentFailures,
      message: promotable
        ? 'Geometry seed passed ranch-containment and zone-overlap validation.'
        : overrideEnabled
          ? `Geometry seed failed validation: ${containmentFailures.length} containment issue${containmentFailures.length === 1 ? '' : 's'} and ${overlapPairs.length} overlap pair${overlapPairs.length === 1 ? '' : 's'} detected. Override is enabled, so provisional promotion is allowed if an operator runs the bootstrap flow intentionally.`
          : `Geometry seed failed validation: ${containmentFailures.length} containment issue${containmentFailures.length === 1 ? '' : 's'} and ${overlapPairs.length} overlap pair${overlapPairs.length === 1 ? '' : 's'} detected.`,
      overlapPairCount: overlapPairs.length,
      overlapPairs,
      overrideEnabled,
      promotable,
      seedGeneratedAt: this.seed.generated_at,
      zonesWithinRanch,
    };
  }

  async listPersistedZoneRefs() {
    return listPersistedZoneRefs(this.createReadContext());
  }

  async getPersistedGeometryCounts(): Promise<GeometryPersistenceSummary> {
    return getPersistedGeometryCounts(this.createReadContext());
  }

  async getRanchBoundarySummary(): Promise<RanchBoundary> {
    return getRanchBoundarySummary(this.createReadContext());
  }

  async getRanchCoordinateLabel() {
    const coordinates = await this.getRanchCentroidCoordinates();
    return coordinates ? formatCoordinateLabel(coordinates.latitude, coordinates.longitude) : null;
  }

  async getRanchCentroidCoordinates() {
    return getRanchCentroidCoordinates(this.createReadContext());
  }

  async listZoneSummaries(): Promise<ZoneSummary[]> {
    return listZoneSummaries(this.createReadContext());
  }

  async listAreas() {
    return listAreas(this.createReadContext());
  }

  async getRanchGeometryFeatureCollection(): Promise<GeoJsonFeatureCollection<RanchGeometryProperties>> {
    return getRanchGeometryFeatureCollection(this.createReadContext());
  }

  async getZoneGeometryFeatureCollection(): Promise<GeoJsonFeatureCollection<ZoneGeometryProperties>> {
    return getZoneGeometryFeatureCollection(this.createReadContext());
  }

  async getZoneBoundaryCoordinateLines(zoneRefs: string[]) {
    return getZoneBoundaryCoordinateLines(this.createReadContext(), zoneRefs);
  }

  async getAreasByRefs(areaRefs: string[]) {
    return getAreasByRefs(this.createReadContext(), areaRefs);
  }

  async getAreaGeometryFeatureCollection(): Promise<GeoJsonFeatureCollection<AreaGeometryProperties>> {
    return getAreaGeometryFeatureCollection(this.createReadContext());
  }

  async getAreaGeometrySnapshotByRef(areaRef: string): Promise<GeoJsonGeometry | null> {
    return getAreaGeometrySnapshotByRef(this.createReadContext(), areaRef);
  }

  async importAreaGeometry(
    inputs: import('./bakki-geometry.mutations').ImportBakkiAreaGeometryInput[],
    options: { dryRun?: boolean } = {},
  ): Promise<import('./bakki-geometry.mutations').ImportBakkiAreaGeometryResult> {
    return importBakkiAreaGeometry({
      bakkiCore: this.bakkiCore,
      ensureSchema: () => this.ensureSchema(),
      inputs,
      options,
    });
  }

  async updateZoneGeometry(
    zoneRef: string,
    geometry: GeoJsonGeometry,
  ): Promise<import('./bakki-geometry.mutations').UpdateBakkiZoneGeometryResult> {
    return updateBakkiZoneGeometry({
      bakkiCore: this.bakkiCore,
      ensureSchema: () => this.ensureSchema(),
      geometry,
      zoneRef,
    });
  }

  async updateAreaDetails(
    areaRef: string,
    areaName: string,
    assignedSpeciesRef?: string | null,
  ): Promise<import('./bakki-geometry.mutations').UpdateBakkiAreaDetailsResult> {
    return updateBakkiAreaDetails({
      assignedSpeciesRef,
      areaName,
      areaRef,
      bakkiCore: this.bakkiCore,
      ensureSchema: () => this.ensureSchema(),
    });
  }

  async deleteArea(
    areaRef: string,
  ): Promise<import('./bakki-geometry.mutations').DeleteBakkiAreaResult> {
    return deleteBakkiArea({
      areaRef,
      bakkiCore: this.bakkiCore,
      ensureSchema: () => this.ensureSchema(),
    });
  }

  private async ensureSchema() {
    await ensureSchemaInitialized({
      getSchemaInitPromise: () => this.schemaInitPromise,
      initialize: () => this.ensureSchemaInternal(),
      isConfigured: this.bakkiCore.isConfigured(),
      schemaEnsured: this.schemaEnsured,
      setSchemaInitPromise: (promise) => {
        this.schemaInitPromise = promise;
      },
    });
  }

  private async ensureSchemaInternal() {
    await ensureBakkiGeometrySchema({
      bakkiCore: this.bakkiCore,
    });
    this.schemaEnsured = true;
  }

  private createReadContext() {
    return {
      bakkiCore: this.bakkiCore,
      ensureSchema: () => this.ensureSchema(),
      logger: this.logger,
    };
  }
}
