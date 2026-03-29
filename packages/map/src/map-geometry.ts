import KML from 'ol/format/KML';
import GeoJSON from 'ol/format/GeoJSON';
import { Geometry } from 'ol/geom';
import type Feature from 'ol/Feature';
import type { SimpleFeatureCollection } from './types';

export function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function writeGeometry(geoJsonFormat: GeoJSON, geometry: Geometry) {
  return geoJsonFormat.writeGeometryObject(geometry, {
    featureProjection: 'EPSG:3857',
    dataProjection: 'EPSG:4326',
  }) as { type: string; coordinates: unknown };
}

export function readGeometry(
  geoJsonFormat: GeoJSON,
  geometry: { type: string; coordinates: unknown },
) {
  return geoJsonFormat.readGeometry(geometry, {
    featureProjection: 'EPSG:3857',
    dataProjection: 'EPSG:4326',
  });
}

export function formatBoundaryCoordinates(coordinates: unknown): string[] {
  return extractFirstLinearRing(coordinates)
    .map(([lon, lat], index) => `P${index + 1}: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
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

export function readFeatures({
  geoJson,
  kml,
  geoJsonFormat,
  kmlFormat,
  optional = false,
}: {
  geoJson?: SimpleFeatureCollection | null;
  kml?: string;
  geoJsonFormat: GeoJSON;
  kmlFormat: KML;
  optional?: boolean;
}) {
  if (geoJson) {
    return geoJsonFormat.readFeatures(geoJson, {
      featureProjection: 'EPSG:3857',
    }) as Feature<Geometry>[];
  }

  if (!kml) {
    if (optional) {
      return [] as Feature<Geometry>[];
    }
    throw new Error('Map source data was not provided.');
  }

  return kmlFormat.readFeatures(kml, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  }) as Feature<Geometry>[];
}
