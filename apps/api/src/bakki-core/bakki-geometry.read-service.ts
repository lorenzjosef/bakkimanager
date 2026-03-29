import type { Logger } from '@nestjs/common';
import type {
  AreaGeometryProperties,
  GeoJsonFeatureCollection,
  GeoJsonGeometry,
  GeometryPersistenceSummary,
  RanchBoundary,
  RanchGeometryProperties,
  ZoneGeometryProperties,
  ZoneSummary,
} from '@bakki/domain';
import {
  buildUnavailableRanchBoundarySummary,
  emptyFeatureCollection,
  emptyGeometryPersistenceSummary,
  formatBoundaryCoordinates,
  parseGeoJsonGeometry,
} from './bakki-geometry.helpers';
import {
  type BakkiAreaCatalogRecord,
  getAreaRowByRef,
  getPersistedRanchRow,
  mapAreaCatalogRecord,
  mapAreaFeature,
  mapZoneFeature,
  mapZoneSummary,
  queryAreaRows,
  queryZoneRows,
} from './bakki-geometry.reads';
import type { CoordinatePoint } from './bakki-geometry.helpers';
import type { BakkiCoreService } from './bakki-core.service';

export interface BakkiGeometryReadContext {
  bakkiCore: BakkiCoreService;
  ensureSchema: () => Promise<void>;
  logger: Pick<Logger, 'warn'>;
}

export async function listPersistedZoneRefs({
  bakkiCore,
  ensureSchema,
}: BakkiGeometryReadContext) {
  if (!bakkiCore.isConfigured()) {
    return [];
  }

  await ensureSchema();
  const result = await bakkiCore.query<{ zone_ref: string }>(
    `
      select zone_ref
      from bakki_zone
      order by sort_order asc, zone_ref asc
    `,
  );

  return result.rows.map((row) => row.zone_ref);
}

export async function getPersistedGeometryCounts({
  bakkiCore,
  ensureSchema,
  logger,
}: BakkiGeometryReadContext): Promise<GeometryPersistenceSummary> {
  if (!bakkiCore.isConfigured()) {
    return emptyGeometryPersistenceSummary();
  }

  try {
    await ensureSchema();
    const result = await bakkiCore.query<{
      area_count: number | string;
      ranch_count: number | string;
      zone_count: number | string;
    }>(
      `
        select
          (select count(*) from bakki_ranch) as ranch_count,
          (select count(*) from bakki_zone) as zone_count,
          (select count(*) from bakki_area) as area_count
      `,
    );

    const row = result.rows[0];
    return {
      ranchCount: Number(row?.ranch_count ?? 0),
      zoneCount: Number(row?.zone_count ?? 0),
      areaCount: Number(row?.area_count ?? 0),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown persisted-geometry count error';
    logger.warn(`Bakki Core persisted geometry counts unavailable. ${message}`);
    return emptyGeometryPersistenceSummary();
  }
}

export async function getRanchBoundarySummary({
  bakkiCore,
  ensureSchema,
  logger,
}: BakkiGeometryReadContext): Promise<RanchBoundary> {
  if (!bakkiCore.isConfigured()) {
    return buildUnavailableRanchBoundarySummary();
  }

  try {
    await ensureSchema();
    const row = await getPersistedRanchRow(bakkiCore);
    if (!row) {
      return buildUnavailableRanchBoundarySummary();
    }

    return {
      id: row.ranch_ref,
      name: row.name,
      sourceFile: row.source_file_name,
      sourceFeatureName: row.source_feature_name,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ranch geometry error';
    logger.warn(`Bakki Core ranch geometry unavailable. ${message}`);
    return buildUnavailableRanchBoundarySummary();
  }
}

export async function getRanchCentroidCoordinates({
  bakkiCore,
  ensureSchema,
  logger,
}: BakkiGeometryReadContext): Promise<CoordinatePoint | null> {
  if (!bakkiCore.isConfigured()) {
    return null;
  }

  try {
    await ensureSchema();
    const result = await bakkiCore.query<{
      latitude: number | string | null;
      longitude: number | string | null;
    }>(
      `
        select
          ST_Y(ST_Centroid(boundary_geometry::geometry)) as latitude,
          ST_X(ST_Centroid(boundary_geometry::geometry)) as longitude
        from bakki_ranch
        order by ranch_ref asc
        limit 1
      `,
    );

    const row = result.rows[0];
    const latitude = row?.latitude === null || row?.latitude === undefined ? null : Number(row.latitude);
    const longitude = row?.longitude === null || row?.longitude === undefined ? null : Number(row.longitude);
    if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ranch coordinate error';
    logger.warn(`Bakki Core ranch coordinates unavailable. ${message}`);
    return null;
  }
}

export async function listZoneSummaries({
  bakkiCore,
  ensureSchema,
  logger,
}: BakkiGeometryReadContext): Promise<ZoneSummary[]> {
  if (!bakkiCore.isConfigured()) {
    return [];
  }

  try {
    await ensureSchema();
    const rows = await queryZoneRows(bakkiCore, { includeAreaCount: true });
    return rows.map((row) => mapZoneSummary(row));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown zone geometry error';
    logger.warn(`Bakki Core zone geometry unavailable. ${message}`);
    return [];
  }
}

export async function listAreas({
  bakkiCore,
  ensureSchema,
  logger,
}: BakkiGeometryReadContext) {
  if (!bakkiCore.isConfigured()) {
    return new Map<string, BakkiAreaCatalogRecord>();
  }

  try {
    await ensureSchema();
    const rows = await queryAreaRows(bakkiCore);

    return new Map(
      rows.map((row) => [
        row.area_ref,
        mapAreaCatalogRecord(row),
      ]),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown area catalog error';
    logger.warn(`Bakki Core area catalog unavailable. ${message}`);
    return new Map<string, BakkiAreaCatalogRecord>();
  }
}

export async function getRanchGeometryFeatureCollection({
  bakkiCore,
  ensureSchema,
  logger,
}: BakkiGeometryReadContext): Promise<GeoJsonFeatureCollection<RanchGeometryProperties>> {
  if (!bakkiCore.isConfigured()) {
    return emptyFeatureCollection<RanchGeometryProperties>();
  }

  try {
    await ensureSchema();
    const row = await getPersistedRanchRow(bakkiCore);
    if (!row) {
      return emptyFeatureCollection<RanchGeometryProperties>();
    }

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: row.ranch_ref,
          geometry: parseGeoJsonGeometry(row.geometry_geojson),
          properties: {
            id: row.ranch_ref,
            name: row.name,
            sourceFile: row.source_file_name,
            sourceFeatureName: row.source_feature_name,
          },
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ranch GeoJSON error';
    logger.warn(`Bakki Core ranch GeoJSON unavailable. ${message}`);
    return emptyFeatureCollection<RanchGeometryProperties>();
  }
}

export async function getZoneGeometryFeatureCollection({
  bakkiCore,
  ensureSchema,
  logger,
}: BakkiGeometryReadContext): Promise<GeoJsonFeatureCollection<ZoneGeometryProperties>> {
  if (!bakkiCore.isConfigured()) {
    return emptyFeatureCollection<ZoneGeometryProperties>();
  }

  try {
    await ensureSchema();
    const rows = await queryZoneRows(bakkiCore);

    return {
      type: 'FeatureCollection',
      features: rows.map((row) => mapZoneFeature(row)),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown zone GeoJSON error';
    logger.warn(`Bakki Core zone GeoJSON unavailable. ${message}`);
    return emptyFeatureCollection<ZoneGeometryProperties>();
  }
}

export async function getZoneBoundaryCoordinateLines(
  {
    bakkiCore,
    ensureSchema,
    logger,
  }: BakkiGeometryReadContext,
  zoneRefs: string[],
) {
  if (zoneRefs.length === 0 || !bakkiCore.isConfigured()) {
    return new Map<string, string[]>();
  }

  try {
    await ensureSchema();
    const rows = await queryZoneRows(bakkiCore, { zoneRefs });

    return new Map(
      rows.map((row) => [
        row.zone_ref,
        formatBoundaryCoordinates(parseGeoJsonGeometry(row.geometry_geojson).coordinates),
      ]),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown zone boundary-coordinate error';
    logger.warn(`Bakki Core boundary coordinates unavailable. ${message}`);
    return new Map<string, string[]>();
  }
}

export async function getAreasByRefs(
  {
    bakkiCore,
    ensureSchema,
    logger,
  }: BakkiGeometryReadContext,
  areaRefs: string[],
) {
  if (areaRefs.length === 0 || !bakkiCore.isConfigured()) {
    return new Map<string, BakkiAreaCatalogRecord>();
  }

  try {
    await ensureSchema();
    const rows = await queryAreaRows(bakkiCore, { areaRefs });

    return new Map(
      rows.map((row) => [
        row.area_ref,
        mapAreaCatalogRecord(row),
      ]),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown area catalog error';
    logger.warn(`Bakki Core area catalog unavailable. ${message}`);
    return new Map<string, BakkiAreaCatalogRecord>();
  }
}

export async function getAreaGeometryFeatureCollection({
  bakkiCore,
  ensureSchema,
  logger,
}: BakkiGeometryReadContext): Promise<GeoJsonFeatureCollection<AreaGeometryProperties>> {
  if (!bakkiCore.isConfigured()) {
    return emptyFeatureCollection<AreaGeometryProperties>();
  }

  try {
    await ensureSchema();
    const rows = await queryAreaRows(bakkiCore, { includeGeometry: true });

    return {
      type: 'FeatureCollection',
      features: rows
        .filter((row) => Boolean(row.geometry_geojson))
        .map((row) => mapAreaFeature(row)),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown area GeoJSON error';
    logger.warn(`Bakki Core area GeoJSON unavailable. ${message}`);
    return emptyFeatureCollection<AreaGeometryProperties>();
  }
}

export async function getAreaGeometrySnapshotByRef(
  {
    bakkiCore,
    ensureSchema,
    logger,
  }: BakkiGeometryReadContext,
  areaRef: string,
): Promise<GeoJsonGeometry | null> {
  if (!areaRef.trim() || !bakkiCore.isConfigured()) {
    return null;
  }

  try {
    await ensureSchema();
    const row = await getAreaRowByRef(bakkiCore, areaRef);
    return row?.geometry_geojson ? parseGeoJsonGeometry(row.geometry_geojson) : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown area geometry snapshot error';
    logger.warn(`Bakki Core area geometry snapshot unavailable. ${message}`);
    return null;
  }
}
