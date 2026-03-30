/**
 * Geometry utilities for mobile area capture and validation.
 */

import type { GeoJsonGeometry } from '@bakki/domain';
import type { CapturedPoint } from './types';

/**
 * Calculate the approximate area of a polygon in hectares using the Shoelace formula.
 * This is a simplified calculation suitable for small areas.
 */
export function calculatePolygonArea(points: CapturedPoint[]): number {
  if (points.length < 3) return 0;

  // Earth radius in meters
  const R = 6371000;

  // Convert to radians and project to approximate planar coordinates
  const toMeters = (lat: number, lng: number, centerLat: number, centerLng: number) => {
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const centerLatRad = (centerLat * Math.PI) / 180;
    const centerLngRad = (centerLng * Math.PI) / 180;

    const x = R * (lngRad - centerLngRad) * Math.cos(centerLatRad);
    const y = R * (latRad - centerLatRad);
    return { x, y };
  };

  // Find center point
  const centerLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const centerLng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;

  // Convert points to meters relative to center
  const projected = points.map((p) => toMeters(p.latitude, p.longitude, centerLat, centerLng));

  // Shoelace formula
  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length;
    area += projected[i].x * projected[j].y;
    area -= projected[j].x * projected[i].y;
  }
  area = Math.abs(area) / 2;

  // Convert to hectares (1 hectare = 10,000 m²)
  return area / 10000;
}

/**
 * Convert captured points to GeoJSON Polygon geometry.
 */
export function pointsToPolygon(points: CapturedPoint[]): GeoJsonGeometry {
  if (points.length < 3) {
    throw new Error('Polygon requires at least 3 points');
  }

  // GeoJSON coordinates are [longitude, latitude]
  const coordinates = points.map((p) => [p.longitude, p.latitude]);

  // Close the ring by adding the first point at the end
  coordinates.push([points[0].longitude, points[0].latitude]);

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

/**
 * Check if a polygon is self-intersecting (crosses itself).
 * Simple O(n²) check suitable for small polygons.
 */
export function isSelfIntersecting(points: CapturedPoint[]): boolean {
  if (points.length < 4) return false;

  const lineIntersects = (
    p1: CapturedPoint,
    p2: CapturedPoint,
    p3: CapturedPoint,
    p4: CapturedPoint
  ): boolean => {
    const ccw = (A: CapturedPoint, B: CapturedPoint, C: CapturedPoint): boolean => {
      return (
        (C.latitude - A.latitude) * (B.longitude - A.longitude) >
        (B.latitude - A.latitude) * (C.longitude - A.longitude)
      );
    };

    return (
      ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
      ccw(p1, p2, p3) !== ccw(p1, p2, p4)
    );
  };

  const n = points.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      // Skip adjacent segments
      if (i === 0 && j === n - 1) continue;

      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[j];
      const p4 = points[(j + 1) % n];

      if (lineIntersects(p1, p2, p3, p4)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate captured points for area creation.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCapturedPoints(
  points: CapturedPoint[],
  options: {
    minPoints?: number;
    minAreaHectares?: number;
    maxAreaHectares?: number;
    minAccuracyMeters?: number;
  } = {}
): ValidationResult {
  const {
    minPoints = 3,
    minAreaHectares = 0.01,
    maxAreaHectares = 1000,
    minAccuracyMeters = 50,
  } = options;

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum point count
  if (points.length < minPoints) {
    errors.push(`At least ${minPoints} points are required`);
    return { isValid: false, errors, warnings };
  }

  // Check for self-intersection
  if (isSelfIntersecting(points)) {
    errors.push('Boundary lines cannot cross each other');
  }

  // Calculate area
  const area = calculatePolygonArea(points);

  if (area < minAreaHectares) {
    errors.push(`Area is too small (${area.toFixed(4)} ha). Minimum is ${minAreaHectares} ha.`);
  }

  if (area > maxAreaHectares) {
    errors.push(`Area is too large (${area.toFixed(2)} ha). Maximum is ${maxAreaHectares} ha.`);
  }

  // Check GPS accuracy
  const avgAccuracy = points.reduce((sum, p) => sum + p.accuracy, 0) / points.length;
  if (avgAccuracy > minAccuracyMeters) {
    warnings.push(
      `GPS accuracy is low (${avgAccuracy.toFixed(1)}m average). Consider recapturing in better conditions.`
    );
  }

  // Check for duplicate consecutive points
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (p1.latitude === p2.latitude && p1.longitude === p2.longitude) {
      warnings.push('Duplicate consecutive points detected');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate the bounding box of a set of points.
 */
export function getBoundingBox(points: CapturedPoint[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  centerLat: number;
  centerLng: number;
} {
  if (points.length === 0) {
    throw new Error('Cannot calculate bounding box of empty point set');
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    centerLat: (minLat + maxLat) / 2,
    centerLng: (minLng + maxLng) / 2,
  };
}

/**
 * Simplify a point array using Douglas-Peucker algorithm.
 * Useful for reducing track points from boundary walks.
 */
export function simplifyPoints(points: CapturedPoint[], tolerance: number = 0.00001): CapturedPoint[] {
  if (points.length <= 2) return points;

  // Find the point with the maximum distance from the line between first and last
  let maxDist = 0;
  let maxIndex = 0;

  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPoints(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(
  point: CapturedPoint,
  lineStart: CapturedPoint,
  lineEnd: CapturedPoint
): number {
  const dx = lineEnd.longitude - lineStart.longitude;
  const dy = lineEnd.latitude - lineStart.latitude;

  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return 0;

  const u =
    ((point.longitude - lineStart.longitude) * dx +
      (point.latitude - lineStart.latitude) * dy) /
    (mag * mag);

  const closestX = lineStart.longitude + u * dx;
  const closestY = lineStart.latitude + u * dy;

  return Math.sqrt(
    Math.pow(point.longitude - closestX, 2) + Math.pow(point.latitude - closestY, 2)
  );
}
