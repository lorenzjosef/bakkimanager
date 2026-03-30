import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { validateGeoJsonGeometry } from './geometry.validator';

test('validateGeoJsonGeometry accepts valid Polygon geometry', () => {
  const polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [-122.4, 37.8],
        [-122.4, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.8],
        [-122.4, 37.8],
      ],
    ],
  };

  // Should not throw
  validateGeoJsonGeometry(polygon);
});

test('validateGeoJsonGeometry accepts valid MultiPolygon geometry', () => {
  const multiPolygon = {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [-122.4, 37.8],
          [-122.4, 37.7],
          [-122.3, 37.7],
          [-122.3, 37.8],
          [-122.4, 37.8],
        ],
      ],
    ],
  };

  // Should not throw
  validateGeoJsonGeometry(multiPolygon);
});

test('validateGeoJsonGeometry rejects unsupported geometry types', () => {
  const point = {
    type: 'Point',
    coordinates: [-122.4, 37.8],
  };

  assert.throws(
    () => validateGeoJsonGeometry(point),
    BadRequestException,
  );
});

test('validateGeoJsonGeometry validates allowed types when specified', () => {
  const polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [-122.4, 37.8],
        [-122.4, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.8],
        [-122.4, 37.8],
      ],
    ],
  };

  // Should accept Polygon when Polygon is allowed
  validateGeoJsonGeometry(polygon, ['Polygon']);

  // Should reject Polygon when only MultiPolygon is allowed
  assert.throws(
    () => validateGeoJsonGeometry(polygon, ['MultiPolygon']),
    BadRequestException,
  );
});

test('validateGeoJsonGeometry rejects coordinates outside WGS84 bounds', () => {
  const invalidLon = {
    type: 'Polygon',
    coordinates: [
      [
        [-200, 37.8], // Invalid longitude
        [-122.4, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.8],
        [-200, 37.8],
      ],
    ],
  };

  assert.throws(
    () => validateGeoJsonGeometry(invalidLon),
    BadRequestException,
  );

  const invalidLat = {
    type: 'Polygon',
    coordinates: [
      [
        [-122.4, 100], // Invalid latitude
        [-122.4, 37.7],
        [-122.3, 37.7],
        [-122.3, 100],
        [-122.4, 100],
      ],
    ],
  };

  assert.throws(
    () => validateGeoJsonGeometry(invalidLat),
    BadRequestException,
  );
});

test('validateGeoJsonGeometry rejects NaN coordinates', () => {
  const nanCoords = {
    type: 'Polygon',
    coordinates: [
      [
        [NaN, 37.8],
        [-122.4, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.8],
        [NaN, 37.8],
      ],
    ],
  };

  assert.throws(
    () => validateGeoJsonGeometry(nanCoords),
    BadRequestException,
  );
});

test('validateGeoJsonGeometry rejects Infinity coordinates', () => {
  const infinityCoords = {
    type: 'Polygon',
    coordinates: [
      [
        [Infinity, 37.8],
        [-122.4, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.8],
        [Infinity, 37.8],
      ],
    ],
  };

  assert.throws(
    () => validateGeoJsonGeometry(infinityCoords),
    BadRequestException,
  );
});

test('validateGeoJsonGeometry rejects unclosed polygon rings', () => {
  const unclosedRing = {
    type: 'Polygon',
    coordinates: [
      [
        [-122.4, 37.8],
        [-122.4, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.8],
        // Missing closing point
      ],
    ],
  };

  assert.throws(
    () => validateGeoJsonGeometry(unclosedRing),
    BadRequestException,
  );
});

test('validateGeoJsonGeometry rejects polygons with too few points', () => {
  const tooFewPoints = {
    type: 'Polygon',
    coordinates: [
      [
        [-122.4, 37.8],
        [-122.4, 37.7],
        [-122.4, 37.8], // Only 2 unique points + closure
      ],
    ],
  };

  assert.throws(
    () => validateGeoJsonGeometry(tooFewPoints),
    BadRequestException,
  );
});

test('validateGeoJsonGeometry rejects geometries exceeding max points', () => {
  // Create a polygon with more than the default 10000 points
  const manyPoints: [number, number][] = [];
  for (let i = 0; i < 10002; i++) {
    manyPoints.push([-122.4 + i * 0.0001, 37.8]);
  }
  // Close the ring
  manyPoints.push(manyPoints[0]);

  const tooManyPoints = {
    type: 'Polygon',
    coordinates: [manyPoints],
  };

  assert.throws(
    () => validateGeoJsonGeometry(tooManyPoints),
    BadRequestException,
  );
});

test('validateGeoJsonGeometry rejects deeply nested structures (DoS protection)', () => {
  // Create deeply nested array structure (over max depth)
  const deeplyNested = {
    type: 'Polygon',
    coordinates: [[[[[[[[[-122.4, 37.8]]]]]]]]], // Too deep
  };

  assert.throws(
    () => validateGeoJsonGeometry(deeplyNested),
    BadRequestException,
  );
});

test('validateGeoJsonGeometry rejects missing coordinates', () => {
  const noCoords = {
    type: 'Polygon',
  };

  assert.throws(
    () => validateGeoJsonGeometry(noCoords as { type: string; coordinates: unknown }),
    BadRequestException,
  );
});

test('validateGeoJsonGeometry rejects non-array coordinates', () => {
  const invalidCoords = {
    type: 'Polygon',
    coordinates: 'not-an-array',
  };

  assert.throws(
    () => validateGeoJsonGeometry(invalidCoords),
    BadRequestException,
  );
});
