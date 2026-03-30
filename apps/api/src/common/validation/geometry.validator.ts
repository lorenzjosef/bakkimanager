import { BadRequestException } from '@nestjs/common';

export interface GeoJsonGeometry {
  type: string;
  coordinates: unknown;
}

const MAX_COORDINATE_POINTS = 10000;
const MAX_COORDINATE_DEPTH = 4; // MultiPolygon requires 4 levels of nesting

/**
 * Validates GeoJSON geometry at application level before database operations.
 * PostGIS ST_IsValid provides additional validation at the database level.
 */
export function validateGeoJsonGeometry(
  geometry: GeoJsonGeometry,
  allowedTypes: string[] = ['Polygon', 'MultiPolygon'],
): void {
  if (!geometry || typeof geometry !== 'object') {
    throw new BadRequestException('Geometry must be a valid GeoJSON object');
  }

  if (!allowedTypes.includes(geometry.type)) {
    throw new BadRequestException(
      `Geometry type must be one of: ${allowedTypes.join(', ')}. Got: ${geometry.type}`,
    );
  }

  if (!Array.isArray(geometry.coordinates)) {
    throw new BadRequestException('Geometry coordinates must be an array');
  }

  const pointCount = countCoordinatePoints(geometry.coordinates, 0);
  if (pointCount > MAX_COORDINATE_POINTS) {
    throw new BadRequestException(
      `Geometry exceeds maximum complexity (${MAX_COORDINATE_POINTS} points). Got: ${pointCount}`,
    );
  }

  if (pointCount < 4) {
    throw new BadRequestException('Polygon geometry must have at least 4 coordinate points');
  }

  validateCoordinateStructure(geometry.type, geometry.coordinates);
}

function countCoordinatePoints(coordinates: unknown, depth: number): number {
  if (depth > MAX_COORDINATE_DEPTH) {
    throw new BadRequestException('Geometry coordinate nesting is too deep');
  }

  if (!Array.isArray(coordinates)) {
    return 0;
  }

  // Check if this is a coordinate pair [lon, lat] or [lon, lat, altitude]
  if (
    coordinates.length >= 2 &&
    coordinates.length <= 3 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
  ) {
    return 1;
  }

  // Otherwise, recurse into nested arrays
  let count = 0;
  for (const item of coordinates) {
    count += countCoordinatePoints(item, depth + 1);
  }
  return count;
}

function validateCoordinateStructure(type: string, coordinates: unknown[]): void {
  if (type === 'Polygon') {
    validatePolygonCoordinates(coordinates);
  } else if (type === 'MultiPolygon') {
    validateMultiPolygonCoordinates(coordinates);
  }
}

function validatePolygonCoordinates(rings: unknown[]): void {
  if (rings.length === 0) {
    throw new BadRequestException('Polygon must have at least one ring (exterior boundary)');
  }

  for (let i = 0; i < rings.length; i++) {
    const ring = rings[i];
    if (!Array.isArray(ring)) {
      throw new BadRequestException(`Polygon ring ${i} must be an array of coordinates`);
    }

    if (ring.length < 4) {
      throw new BadRequestException(
        `Polygon ring ${i} must have at least 4 points (got ${ring.length})`,
      );
    }

    validateLinearRing(ring, i);
  }
}

function validateMultiPolygonCoordinates(polygons: unknown[]): void {
  if (polygons.length === 0) {
    throw new BadRequestException('MultiPolygon must have at least one polygon');
  }

  for (let i = 0; i < polygons.length; i++) {
    const polygon = polygons[i];
    if (!Array.isArray(polygon)) {
      throw new BadRequestException(`MultiPolygon polygon ${i} must be an array`);
    }
    validatePolygonCoordinates(polygon);
  }
}

function validateLinearRing(ring: unknown[], ringIndex: number): void {
  for (let i = 0; i < ring.length; i++) {
    const point = ring[i];
    validateCoordinatePoint(point, `ring ${ringIndex}, point ${i}`);
  }

  // Check ring closure (first point should equal last point)
  const first = ring[0] as number[];
  const last = ring[ring.length - 1] as number[];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    throw new BadRequestException(
      `Polygon ring ${ringIndex} is not closed (first and last points must match)`,
    );
  }
}

function validateCoordinatePoint(point: unknown, location: string): void {
  if (!Array.isArray(point)) {
    throw new BadRequestException(`Coordinate at ${location} must be an array`);
  }

  if (point.length < 2 || point.length > 3) {
    throw new BadRequestException(
      `Coordinate at ${location} must have 2-3 values [lon, lat] or [lon, lat, altitude]`,
    );
  }

  const [lon, lat, altitude] = point as [unknown, unknown, unknown?];

  if (typeof lon !== 'number' || typeof lat !== 'number') {
    throw new BadRequestException(`Coordinate at ${location} must have numeric lon/lat values`);
  }

  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new BadRequestException(`Coordinate at ${location} contains NaN or Infinity`);
  }

  // WGS84 coordinate bounds
  if (lon < -180 || lon > 180) {
    throw new BadRequestException(
      `Longitude at ${location} must be between -180 and 180 (got ${lon})`,
    );
  }

  if (lat < -90 || lat > 90) {
    throw new BadRequestException(
      `Latitude at ${location} must be between -90 and 90 (got ${lat})`,
    );
  }

  if (altitude !== undefined && typeof altitude === 'number' && !Number.isFinite(altitude)) {
    throw new BadRequestException(`Altitude at ${location} contains NaN or Infinity`);
  }
}
