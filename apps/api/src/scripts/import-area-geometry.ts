#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import type { GeoJsonFeatureCollection, GeoJsonGeometry } from '@bakki/domain';
import {
  BakkiGeometryService,
  type ImportBakkiAreaGeometryInput,
} from '../bakki-core/bakki-geometry.service';
import { BakkiCoreService } from '../bakki-core/bakki-core.service';

interface RawFeatureCollection {
  features?: RawFeature[];
  type?: string;
}

interface RawFeature {
  geometry?: GeoJsonGeometry;
  id?: number | string;
  properties?: Record<string, unknown> | null;
  type?: string;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const absolutePath = path.resolve(process.cwd(), args.filePath);
  const raw = await readFile(absolutePath, 'utf8');
  const parsed = JSON.parse(raw) as RawFeatureCollection;

  if (parsed.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    throw new Error('Expected a GeoJSON FeatureCollection.');
  }

  const inputs = parsed.features.map((feature, index) =>
    normalizeFeature(feature, index, path.basename(absolutePath)),
  );

  const bakkiCore = new BakkiCoreService();
  const geometryService = new BakkiGeometryService(bakkiCore);
  const result = await geometryService.importAreaGeometry(inputs, {
    dryRun: args.dryRun,
  });

  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv: string[]) {
  let filePath = '';
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--file') {
      filePath = argv[index + 1] ?? '';
      index += 1;
      continue;
    }

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
  }

  if (!filePath.trim()) {
    throw new Error('Usage: yarn bakki-core:import-areas --file path/to/areas.geojson [--dry-run]');
  }

  return {
    dryRun,
    filePath,
  };
}

function normalizeFeature(
  feature: RawFeature,
  index: number,
  sourceFileName: string,
): ImportBakkiAreaGeometryInput {
  if (feature.type !== 'Feature') {
    throw new Error(`GeoJSON feature at index ${index} is not a Feature.`);
  }

  if (!feature.geometry || !isPolygonGeometry(feature.geometry)) {
    throw new Error(
      `GeoJSON feature at index ${index} must contain a Polygon or MultiPolygon geometry.`,
    );
  }

  const properties = feature.properties ?? {};
  const areaRef =
    readString(properties.areaRef)
    || readString(properties.area_ref)
    || (feature.id === undefined ? '' : String(feature.id))
    || slugify(
      readString(properties.name)
      || readString(properties.areaName)
      || readString(properties.area_name)
      || `area-${index + 1}`,
    );
  const name =
    readString(properties.name)
    || readString(properties.areaName)
    || readString(properties.area_name)
    || areaRef;

  return {
    areaRef,
    geometry: feature.geometry,
    name,
    sourceFeatureName:
      readString(properties.sourceFeatureName)
      || readString(properties.source_feature_name)
      || name,
    sourceFileName:
      readString(properties.sourceFileName)
      || readString(properties.source_file_name)
      || sourceFileName,
    zoneRef: readString(properties.zoneRef) || readString(properties.zone_ref) || null,
  };
}

function isPolygonGeometry(geometry: GeoJsonGeometry) {
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
}

function readString(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
