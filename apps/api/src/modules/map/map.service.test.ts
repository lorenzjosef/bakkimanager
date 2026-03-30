import assert from 'node:assert/strict';
import test from 'node:test';
import { MapService } from './map.service';

function createMapService(options?: {
  areaCatalog?: Array<{
    areaName: string;
    areaRef: string;
    assignedSpeciesRef?: string | null;
    zoneRef: string;
  }>;
  areaMetricsConfigured?: boolean;
  boundaryCoordinatesByZone?: Map<string, string[]>;
  deleteArea?: (areaRef: string) => Promise<{
    areaName: string;
    areaRef: string;
    deletedAt: string;
    zoneRef: string;
  }>;
  geometryConfigured?: boolean;
  getAreasByRefs?: (areaRefs: string[]) => Promise<Map<string, {
    areaName: string;
    areaRef: string;
    assignedSpeciesRef?: string | null;
    zoneRef: string;
  }>>;
  importAreaGeometry?: (inputs: unknown[]) => Promise<unknown>;
  phaseConfigured?: boolean;
  requireSessionActor?: () => Promise<{
    profileId: number | null;
    session: {
      user: {
        id: number;
      };
    };
  }>;
  ranchName?: string;
  speciesConfigured?: boolean;
  speciesList?: Array<{
    commonName: string;
    speciesRef: string;
  }>;
  updateAreaDetails?: (areaRef: string, areaName: string, assignedSpeciesRef?: string | null) => Promise<{
    areaName: string;
    areaRef: string;
    speciesRef: string | null;
    updatedAt: string;
    zoneRef: string;
  }>;
  updateZoneGeometry?: (zoneRef: string, geometry: unknown) => Promise<{
    hectaresEstimate: number | null;
    ranchRef: string;
    updatedAt: string;
    zoneName: string;
    zoneRef: string;
  }>;
  zoneSummaries?: Array<{
    areaCount: number;
    id: string;
    name: string;
    prototypeInteractive: boolean;
    statusLabel: string;
  }>;
}) {
  const areaCatalog = options?.areaCatalog ?? [];
  const zoneSummaries = options?.zoneSummaries ?? [];

  return new MapService(
    {
      recordEvent: async () => {},
    } as never,
    {
      requireSessionActor:
        options?.requireSessionActor
        ?? (async () => {
          throw new Error('not used in this test');
        }),
    } as never,
    {
      isConfigured: () => options?.areaMetricsConfigured ?? false,
      getByAreaRef: async () => null,
      listByAreaRefs: async () => [],
      listLatestObservationRefsByAreaRefs: async () => new Map(),
      listByZoneRefs: async () => [],
      updateMetrics: async () => {
        throw new Error('not used in this test');
      },
    } as never,
    {
      getAreasByRefs:
        options?.getAreasByRefs
        ?? (async (areaRefs: string[]) =>
          new Map(
            areaCatalog
              .filter((area) => areaRefs.includes(area.areaRef))
              .map((area) => [area.areaRef, area] as const),
          )),
      getAreaGeometryFeatureCollection: async () => ({ type: 'FeatureCollection', features: [] }),
      getRanchBoundarySummary: async () => ({
        id: 'ranch-main',
        name: options?.ranchName ?? 'Geometry Unavailable',
        sourceFile: 'Bakki Core',
        sourceFeatureName: 'No persisted ranch geometry',
      }),
      getRanchCoordinateLabel: async () => null,
      getRanchGeometryFeatureCollection: async () => ({ type: 'FeatureCollection', features: [] }),
      getZoneBoundaryCoordinateLines: async () => options?.boundaryCoordinatesByZone ?? new Map(),
      getZoneGeometryFeatureCollection: async () => ({ type: 'FeatureCollection', features: [] }),
      importAreaGeometry:
        options?.importAreaGeometry
        ?? (async () => {
          throw new Error('not used in this test');
        }),
      isConfigured: () => options?.geometryConfigured ?? true,
      listAreas: async () => new Map(areaCatalog.map((area) => [area.areaRef, area] as const)),
      listZoneSummaries: async () => zoneSummaries,
      deleteArea:
        options?.deleteArea
        ?? (async () => {
          throw new Error('not used in this test');
        }),
      updateAreaDetails:
        options?.updateAreaDetails
        ?? (async () => {
          throw new Error('not used in this test');
        }),
      updateZoneGeometry:
        options?.updateZoneGeometry
        ?? (async () => {
          throw new Error('not used in this test');
        }),
    } as never,
    {
      create: async () => {},
      listRecent: async () => [],
    } as never,
    {
      getLatestContractsByAreaRefs: async () => new Map(),
      isConfigured: () => options?.phaseConfigured ?? false,
    } as never,
    {
      isConfigured: () => options?.speciesConfigured ?? true,
      listSpecies: async () => options?.speciesList ?? [],
    } as never,
  );
}

test('getViewerData reports an honest empty state when no persisted geometry exists', async () => {
  const service = createMapService({
    geometryConfigured: true,
    ranchName: 'Geometry Unavailable',
    zoneSummaries: [],
  });

  const data = await service.getViewerData();

  assert.equal(data.zoneCountLabel, '0 Zones');
  assert.equal(data.ranchCountLabel, 'Geometry Unavailable');
  assert.equal(data.defaultHint, 'No mapped zones are available yet.');
  assert.deepEqual(data.zoneOverlaysByZoneId, {});
  assert.deepEqual(data.areaOverlaysByAreaId, {});
});

test('getViewerData includes the assigned sapling name in the area overlay', async () => {
  const service = createMapService({
    areaCatalog: [
      {
        areaName: 'North Block',
        areaRef: 'area-1',
        assignedSpeciesRef: 'downy-birch',
        zoneRef: 'zone-1',
      },
    ],
    speciesConfigured: true,
    speciesList: [{ speciesRef: 'downy-birch', commonName: 'Downy Birch' }],
    zoneSummaries: [
      {
        id: 'zone-1',
        name: 'Zone 1',
        areaCount: 1,
        prototypeInteractive: false,
        statusLabel: 'Mapped',
      },
    ],
  });

  const data = await service.getViewerData();

  assert.equal(data.areaOverlaysByAreaId['area-1']?.speciesValue, 'Downy Birch');
  assert.equal(data.areaOverlaysByAreaId['area-1']?.estimatedCountLabel, 'Trees Planted');
});

test('createArea creates a new Bakki area from the selected zone geometry', async () => {
  let importedAreaRef: string | null = null;

  const service = createMapService({
    areaCatalog: [
      {
        areaName: 'North Block',
        areaRef: 'zone-3-north-block',
        zoneRef: 'zone-3',
      },
    ],
    geometryConfigured: true,
    importAreaGeometry: async (inputs: unknown[]) => {
      importedAreaRef = (inputs[0] as { areaRef: string }).areaRef;
      return {};
    },
    requireSessionActor: async () => ({
      profileId: 44,
      session: {
        user: {
          id: 12,
        },
      },
    }),
    zoneSummaries: [
      {
        id: 'zone-3',
        name: 'Zone 3',
        areaCount: 1,
        prototypeInteractive: true,
        statusLabel: 'Mapped',
      },
    ],
  });

  const result = await service.createArea({
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-23.48, 65.84],
        [-23.46, 65.84],
        [-23.46, 65.86],
        [-23.48, 65.84],
      ]],
    },
    name: 'North Block',
    zoneId: 'zone-3',
  });

  assert.equal(result.areaId, 'zone-3-north-block-2');
  assert.equal(result.areaName, 'North Block');
  assert.equal(importedAreaRef, 'zone-3-north-block-2');
});

test('getManagementData returns only live zones and boundary coordinates', async () => {
  const service = createMapService({
    areaCatalog: [
      {
        areaName: 'North Block',
        areaRef: 'area-1',
        zoneRef: 'zone-1',
      },
    ],
    boundaryCoordinatesByZone: new Map([
      ['zone-1', ['P1: 65.000000, -23.000000', 'P2: 65.100000, -23.000000']],
    ]),
    zoneSummaries: [
      {
        id: 'zone-1',
        name: 'Zone 1',
        areaCount: 1,
        prototypeInteractive: false,
        statusLabel: 'Mapped',
      },
    ],
  });

  const data = await service.getManagementData();

  assert.deepEqual(Object.keys(data.zonesById), ['zone-1']);
  assert.equal(data.zonesById['zone-1']?.editableAreaId, 'area-1');
  assert.deepEqual(data.zonesById['zone-1']?.boundaryCoordinates, [
    'P1: 65.000000, -23.000000',
    'P2: 65.100000, -23.000000',
  ]);
  assert.equal(data.areasById['area-1']?.areaName, 'North Block');
});

test('updateAreaGeometry rejects writes when Bakki Core geometry is unavailable', async () => {
  const service = createMapService({
    geometryConfigured: false,
  });

  await assert.rejects(
    () => service.updateAreaGeometry('area-1', {
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-23.48, 65.84],
          [-23.47, 65.84],
          [-23.47, 65.85],
          [-23.48, 65.84],
        ]],
      },
    }),
    /Bakki Core area geometry is unavailable/,
  );
});

test('updateAreaGeometry keeps validation failures as hard errors when Bakki Core rejects the shape', async () => {
  const service = createMapService({
    areaCatalog: [
      {
        areaName: 'North Block',
        areaRef: 'area-1',
        zoneRef: 'zone-1',
      },
    ],
    geometryConfigured: true,
    importAreaGeometry: async () => {
      throw new Error('Area geometry must remain within the parent zone boundary.');
    },
    requireSessionActor: async () => ({
      profileId: 44,
      session: {
        user: {
          id: 12,
        },
      },
    }),
  });

  await assert.rejects(
    () => service.updateAreaGeometry('area-1', {
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-23.48, 65.84],
          [-23.47, 65.84],
          [-23.47, 65.85],
          [-23.48, 65.84],
        ]],
      },
    }),
    /within the parent zone boundary/,
  );
});

test('updateAreaDetails renames an existing area in Bakki Core', async () => {
  const service = createMapService({
    areaCatalog: [
      {
        areaName: 'North Block',
        areaRef: 'area-1',
        zoneRef: 'zone-1',
      },
    ],
    geometryConfigured: true,
    requireSessionActor: async () => ({
      profileId: 44,
      session: {
        user: {
          id: 12,
        },
      },
    }),
    updateAreaDetails: async () => ({
      areaName: 'North Block Revised',
      areaRef: 'area-1',
      speciesRef: 'downy-birch',
      updatedAt: '2026-03-29T10:00:00.000Z',
      zoneRef: 'zone-1',
    }),
  });

  const result = await service.updateAreaDetails('area-1', {
    name: 'North Block Revised',
  });

  assert.equal(result.areaId, 'area-1');
  assert.equal(result.areaName, 'North Block Revised');
  assert.equal(result.speciesRef, 'downy-birch');
  assert.equal(result.zoneId, 'zone-1');
});

test('deleteArea rejects removal when the area is still assigned to a planting phase', async () => {
  const service = createMapService({
    geometryConfigured: true,
    deleteArea: async () => {
      throw new Error('Area North Block is assigned to a planting phase and cannot be deleted.');
    },
    requireSessionActor: async () => ({
      profileId: 44,
      session: {
        user: {
          id: 12,
        },
      },
    }),
  });

  await assert.rejects(
    () => service.deleteArea('area-1'),
    /cannot be deleted/,
  );
});

test('updateZoneGeometry persists live boundary edits in Bakki Core', async () => {
  const service = createMapService({
    geometryConfigured: true,
    requireSessionActor: async () => ({
      profileId: 44,
      session: {
        user: {
          id: 12,
        },
      },
    }),
    updateZoneGeometry: async () => ({
      hectaresEstimate: 12.4,
      ranchRef: 'ranch-main',
      updatedAt: '2026-03-29T10:00:00.000Z',
      zoneName: 'Zone 3',
      zoneRef: 'zone-3',
    }),
    zoneSummaries: [
      {
        id: 'zone-3',
        name: 'Zone 3',
        areaCount: 1,
        prototypeInteractive: true,
        statusLabel: 'Mapped',
      },
    ],
  });

  const result = await service.updateZoneGeometry('zone-3', {
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-23.48, 65.84],
        [-23.46, 65.84],
        [-23.46, 65.86],
        [-23.48, 65.84],
      ]],
    },
  });

  assert.equal(result.persistence, 'bakki-core');
  assert.equal(result.zoneId, 'zone-3');
  assert.equal(result.zoneName, 'Zone 3');
  assert.ok(result.boundaryCoordinates.length >= 4);
});

test('updateZoneGeometry rejects writes when Bakki Core geometry is unavailable', async () => {
  const service = createMapService({
    geometryConfigured: false,
    zoneSummaries: [
      {
        id: 'zone-3',
        name: 'Zone 3',
        areaCount: 1,
        prototypeInteractive: true,
        statusLabel: 'Mapped',
      },
    ],
  });

  await assert.rejects(
    () => service.updateZoneGeometry('zone-3', {
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-23.48, 65.84],
          [-23.46, 65.84],
          [-23.46, 65.86],
          [-23.48, 65.84],
        ]],
      },
    }),
    /Bakki Core zone geometry is unavailable/,
  );
});

test('updateZoneGeometry keeps validation failures as hard errors when Bakki Core rejects the shape', async () => {
  const service = createMapService({
    geometryConfigured: true,
    requireSessionActor: async () => ({
      profileId: 44,
      session: {
        user: {
          id: 12,
        },
      },
    }),
    updateZoneGeometry: async () => {
      throw new Error('Zone zone-3 must continue covering area area-1.');
    },
    zoneSummaries: [
      {
        id: 'zone-3',
        name: 'Zone 3',
        areaCount: 1,
        prototypeInteractive: true,
        statusLabel: 'Mapped',
      },
    ],
  });

  await assert.rejects(
    () => service.updateZoneGeometry('zone-3', {
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-23.48, 65.84],
          [-23.46, 65.84],
          [-23.46, 65.86],
          [-23.48, 65.84],
        ]],
      },
    }),
    /must continue covering area/,
  );
});
