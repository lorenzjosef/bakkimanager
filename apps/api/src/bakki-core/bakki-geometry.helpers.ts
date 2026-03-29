import {
  type AreaGeometryProperties,
  type GeoJsonFeatureCollection,
  type GeoJsonGeometry,
  type GeometryPersistenceSummary,
  mapManagementFixture,
  previewAreaSeeds,
  type RanchBoundary,
  type RanchGeometryProperties,
  ranchBoundaryFixture,
  type ZoneGeometryProperties,
  type ZoneSummary,
} from '@bakki/domain';

interface GeometrySeedCoordinate {
  lat: number;
  lon: number;
}

export interface CoordinatePoint {
  latitude: number;
  longitude: number;
}

interface GeometrySeedEntry {
  area_hectares_estimate: number;
  boundary_coordinates: GeometrySeedCoordinate[];
  bbox: {
    max_lat: number;
    max_lon: number;
    min_lat: number;
    min_lon: number;
  };
  code: string;
  geometry_wkt?: string;
  name: string;
  source_feature_name: string;
  source_file_name: string;
}

interface GeometrySeedRanch extends GeometrySeedEntry {
  boundary_geometry_wkt: string;
}

export interface GeometrySeedDocument {
  generated_at: string;
  ranch: GeometrySeedRanch;
  source_files: {
    ranch: string;
    zones: string;
  };
  validation?: {
    containment_failures?: string[];
    zone_overlap_pairs?: string[][];
    zones_within_ranch?: boolean;
  };
  zones: GeometrySeedEntry[];
}

export function buildSeedRanchBoundarySummary(seed: GeometrySeedDocument): RanchBoundary {
  return {
    ...ranchBoundaryFixture,
    sourceFile: seed.ranch.source_file_name,
    sourceFeatureName: seed.ranch.source_feature_name,
  };
}

export function buildUnavailableRanchBoundarySummary(): RanchBoundary {
  return {
    id: 'ranch-unavailable',
    name: 'Geometry Unavailable',
    sourceFile: 'Bakki Core',
    sourceFeatureName: 'No persisted ranch geometry',
  };
}

export function buildSeedZoneSummaries(seed: GeometrySeedDocument): ZoneSummary[] {
  const areaCountByZoneRef = new Map<string, number>();
  for (const area of previewAreaSeeds) {
    areaCountByZoneRef.set(area.zoneRef, (areaCountByZoneRef.get(area.zoneRef) ?? 0) + 1);
  }

  return seed.zones.map((zone, index) => {
    const zoneRef = deriveZoneRef(zone.code, zone.name);

    return {
      id: zoneRef,
      name: zone.name,
      areaCount: areaCountByZoneRef.get(zoneRef) ?? 0,
      statusLabel: 'Mapped',
      prototypeInteractive: index === 2,
    };
  });
}

export function buildSeedAreaCatalogByRefs(areaRefs: string[]) {
  const catalog = new Map(
    getSeedAreaCatalogEntries().map((entry) => [entry.areaRef, entry] as const),
  );
  return new Map(
    areaRefs
      .map((areaRef) => {
        const entry = catalog.get(areaRef);
        return entry ? [areaRef, entry] as const : null;
      })
      .filter((entry): entry is readonly [string, { areaName: string; areaRef: string; zoneRef: string }] => Boolean(entry)),
  );
}

export function buildSeedRanchFeatureCollection(seed: GeometrySeedDocument): GeoJsonFeatureCollection<RanchGeometryProperties> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'ranch-main',
        geometry: {
          type: 'Polygon',
          coordinates: [seed.ranch.boundary_coordinates.map((point) => [point.lon, point.lat])],
        },
        properties: {
          id: 'ranch-main',
          name: seed.ranch.name,
          sourceFile: seed.ranch.source_file_name,
          sourceFeatureName: seed.ranch.source_feature_name,
        },
      },
    ],
  };
}

export function getSeedRanchCoordinates(seed: GeometrySeedDocument): CoordinatePoint {
  return {
    latitude: (seed.ranch.bbox.min_lat + seed.ranch.bbox.max_lat) / 2,
    longitude: (seed.ranch.bbox.min_lon + seed.ranch.bbox.max_lon) / 2,
  };
}

export function buildSeedZoneFeatureCollection(seed: GeometrySeedDocument): GeoJsonFeatureCollection<ZoneGeometryProperties> {
  return {
    type: 'FeatureCollection',
    features: seed.zones.map((zone, index) => ({
      type: 'Feature',
      id: deriveZoneRef(zone.code, zone.name),
      geometry: {
        type: 'Polygon',
        coordinates: [zone.boundary_coordinates.map((point) => [point.lon, point.lat])],
      },
      properties: {
        id: deriveZoneRef(zone.code, zone.name),
        name: zone.name,
        statusLabel: 'Mapped',
        prototypeInteractive: index === 2,
        hectaresEstimate: zone.area_hectares_estimate ?? null,
      },
    })),
  };
}

export function buildSeedAreaFeatureCollection(seed: GeometrySeedDocument): GeoJsonFeatureCollection<AreaGeometryProperties> {
  const features: GeoJsonFeatureCollection<AreaGeometryProperties>['features'] = [];

  for (const entry of getSeedAreaCatalogEntries()) {
    const geometry = getSeedAreaGeometrySnapshot(seed, entry.areaRef);
    if (!geometry) {
      continue;
    }

    features.push({
      type: 'Feature',
      id: entry.areaRef,
      geometry,
      properties: {
        areaRef: entry.areaRef,
        zoneRef: entry.zoneRef,
        name: entry.areaName,
        hectaresEstimate: null,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function buildSeedZoneBoundaryCoordinateLines(seed: GeometrySeedDocument, zoneRefs: string[]) {
  const allowed = new Set(zoneRefs);
  return new Map(
    seed.zones
      .map((zone) => {
        const zoneRef = deriveZoneRef(zone.code, zone.name);
        if (!allowed.has(zoneRef)) {
          return null;
        }

        return [zoneRef, zone.boundary_coordinates.map(formatCoordinatePoint)] as const;
      })
      .filter((entry): entry is readonly [string, string[]] => Boolean(entry)),
  );
}

export function deriveZoneRef(code: string, fallbackName: string) {
  const match = code.match(/(\d+)/);
  if (match) {
    return `zone-${match[1]}`;
  }

  return fallbackName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getSeedAreaCatalogEntries() {
  return previewAreaSeeds.map((areaSeed) => ({
    areaRef: areaSeed.areaRef,
    areaName: areaSeed.areaName,
    zoneRef: areaSeed.zoneRef,
  }));
}

export function getSeedAreaGeometrySnapshot(seed: GeometrySeedDocument, areaRef: string): GeoJsonGeometry | null {
  const area = getSeedAreaCatalogEntries().find((entry) => entry.areaRef === areaRef);
  if (!area) {
    return null;
  }

  const zone = seed.zones.find(
    (entry) => deriveZoneRef(entry.code, entry.name) === area.zoneRef,
  );
  if (!zone) {
    return null;
  }

  return {
    type: 'Polygon',
    coordinates: [zone.boundary_coordinates.map((point) => [point.lon, point.lat])],
  };
}

export function toNullableNumber(value: number | string | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

export function emptyGeometryPersistenceSummary(): GeometryPersistenceSummary {
  return {
    ranchCount: 0,
    zoneCount: 0,
    areaCount: 0,
  };
}

export function parseGeoJsonGeometry(value: string) {
  const parsed = JSON.parse(value) as { coordinates: unknown; type: string };
  return {
    type: parsed.type,
    coordinates: parsed.coordinates,
  };
}

export function emptyFeatureCollection<TProperties = Record<string, unknown>>(): GeoJsonFeatureCollection<TProperties> {
  return {
    type: 'FeatureCollection',
    features: [],
  };
}

export function isZoneOverlapPair(value: unknown): value is [string, string] {
  return (
    Array.isArray(value)
    && value.length === 2
    && typeof value[0] === 'string'
    && typeof value[1] === 'string'
  );
}

export function buildBboxPolygonWkt(bbox: GeometrySeedEntry['bbox']) {
  return `POLYGON ((${bbox.min_lon} ${bbox.min_lat}, ${bbox.max_lon} ${bbox.min_lat}, ${bbox.max_lon} ${bbox.max_lat}, ${bbox.min_lon} ${bbox.max_lat}, ${bbox.min_lon} ${bbox.min_lat}))`;
}

export function formatCoordinatePoint(point: GeometrySeedCoordinate, index: number) {
  return `P${index + 1}: ${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`;
}

export function formatCoordinateLabel(lat: number, lon: number) {
  const latHemisphere = lat >= 0 ? 'N' : 'S';
  const lonHemisphere = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)} ${latHemisphere}, ${Math.abs(lon).toFixed(4)} ${lonHemisphere}`;
}

export function formatBoundaryCoordinates(coordinates: unknown): string[] {
  const polygonCoordinates = extractFirstLinearRing(coordinates);
  return polygonCoordinates.map(([lon, lat], index) => `P${index + 1}: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
}

export function extractFirstLinearRing(coordinates: unknown): number[][] {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }

  const first = coordinates[0];
  if (!Array.isArray(first) || first.length === 0) {
    return [];
  }

  if (typeof first[0] === 'number') {
    return coordinates as number[][];
  }

  const second = first[0];
  if (Array.isArray(second) && typeof second[0] === 'number') {
    return first as number[][];
  }

  if (Array.isArray(second) && Array.isArray(second[0])) {
    return second as number[][];
  }

  return [];
}
