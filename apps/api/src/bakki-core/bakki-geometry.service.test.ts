import assert from 'node:assert/strict';
import test from 'node:test';
import { BakkiGeometryService } from './bakki-geometry.service';

function createGeometryService(options?: {
  configured?: boolean;
  rowsByQueryText?: Array<{
    match: string;
    rows: Array<Record<string, unknown>>;
  }>;
}) {
  const configured = options?.configured ?? true;
  const rowsByQueryText = options?.rowsByQueryText ?? [];

  const bakkiCore = {
    isConfigured: () => configured,
    query: async <T>(text: string) => {
      const match = rowsByQueryText.find((entry) => text.includes(entry.match));
      return {
        rows: (match?.rows ?? []) as T[],
      };
    },
    withClient: async () => {
      throw new Error('withClient should not be called in this test');
    },
  };

  const service = new BakkiGeometryService(bakkiCore as never);
  (service as unknown as { schemaEnsured: boolean }).schemaEnsured = true;
  return service;
}

test('configured environments report empty geometry when no persisted rows exist', async () => {
  const service = createGeometryService({
    configured: true,
    rowsByQueryText: [
      { match: 'from bakki_ranch', rows: [] },
      { match: 'from bakki_zone', rows: [] },
      { match: 'from bakki_area', rows: [] },
    ],
  });

  const ranch = await service.getRanchBoundarySummary();
  const ranchGeometry = await service.getRanchGeometryFeatureCollection();
  const zones = await service.listZoneSummaries();
  const zoneGeometry = await service.getZoneGeometryFeatureCollection();
  const areas = await service.getAreasByRefs(['area-1']);
  const allAreas = await service.listAreas();
  const areaGeometry = await service.getAreaGeometryFeatureCollection();

  assert.equal(ranch.name, 'Geometry Unavailable');
  assert.equal(ranch.sourceFeatureName, 'No persisted ranch geometry');
  assert.equal(ranchGeometry.features.length, 0);
  assert.equal(zones.length, 0);
  assert.equal(zoneGeometry.features.length, 0);
  assert.equal(areas.size, 0);
  assert.equal(allAreas.size, 0);
  assert.equal(areaGeometry.features.length, 0);
});

test('non-configured environments also report empty geometry instead of seed data', async () => {
  const service = createGeometryService({ configured: false });

  const ranch = await service.getRanchBoundarySummary();
  const ranchGeometry = await service.getRanchGeometryFeatureCollection();
  const zones = await service.listZoneSummaries();
  const areaGeometry = await service.getAreaGeometryFeatureCollection();

  assert.equal(ranch.name, 'Geometry Unavailable');
  assert.equal(ranchGeometry.features.length, 0);
  assert.deepEqual(zones, []);
  assert.equal(areaGeometry.features.length, 0);
});

test('configured environments return live persisted geometry rows', async () => {
  const service = createGeometryService({
    configured: true,
    rowsByQueryText: [
      {
        match: 'from bakki_ranch',
        rows: [
          {
            ranch_ref: 'ranch-main',
            name: 'Bakki Ranch',
            source_file_name: 'ranch.geojson',
            source_feature_name: 'Ranch Boundary',
            geometry_geojson: '{"type":"Polygon","coordinates":[[[-23,65],[-22,65],[-22,66],[-23,65]]]}',
          },
        ],
      },
      {
        match: 'from bakki_zone',
        rows: [
          {
            zone_ref: 'zone-1',
            name: 'Zone 1',
            status_label: 'Mapped',
            prototype_interactive: false,
            area_hectares_estimate: 12.3,
            area_count: '1',
            geometry_geojson: '{"type":"Polygon","coordinates":[[[-23,65],[-22.5,65],[-22.5,65.5],[-23,65]]]}',
          },
        ],
      },
      {
        match: 'from bakki_area',
        rows: [
          {
            area_ref: 'area-1',
            zone_ref: 'zone-1',
            area_name: 'North Block',
            assigned_species_ref: 'downy-birch',
            area_hectares_estimate: 4.1,
            geometry_geojson: '{"type":"Polygon","coordinates":[[[-23,65],[-22.8,65],[-22.8,65.2],[-23,65]]]}',
          },
        ],
      },
    ],
  });

  const ranch = await service.getRanchBoundarySummary();
  const zones = await service.listZoneSummaries();
  const areas = await service.getAreasByRefs(['area-1']);
  const allAreas = await service.listAreas();
  const areaGeometry = await service.getAreaGeometryFeatureCollection();

  assert.equal(ranch.name, 'Bakki Ranch');
  assert.equal(zones.length, 1);
  assert.equal(zones[0]?.id, 'zone-1');
  assert.equal(areas.get('area-1')?.areaName, 'North Block');
  assert.equal(areas.get('area-1')?.assignedSpeciesRef, 'downy-birch');
  assert.equal(allAreas.get('area-1')?.zoneRef, 'zone-1');
  assert.equal(areaGeometry.features.length, 1);
});
