import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { GeoJsonGeometry } from '@bakki/domain';
import { TreeSurveysService } from './tree-surveys.service';

const GEOMETRY: GeoJsonGeometry = {
  type: 'Polygon',
  coordinates: [[
    [-23.48, 65.84],
    [-23.46, 65.84],
    [-23.46, 65.86],
    [-23.48, 65.84],
  ]],
};

function createTreeSurveysService(overrides?: {
  authService?: {
    requireSessionActor?: (token?: string) => Promise<{
      profileId: number | null;
      session: { user: { role: string } };
    }>;
  };
  bakkiTreeSurvey?: {
    createPlot?: (input: unknown) => Promise<unknown>;
    getPlot?: (plotRef: string) => Promise<unknown>;
    isConfigured?: () => boolean;
    listAreaRollups?: (areaRefs: string[]) => Promise<Map<string, unknown>>;
    listPlots?: (ranchRef?: string) => Promise<unknown[]>;
    listSamples?: (plotRef: string) => Promise<unknown[]>;
    listZoneRollups?: (zoneRefs: string[]) => Promise<Map<string, unknown>>;
    recordSample?: (plotRef: string, input: unknown) => Promise<unknown>;
    updatePlot?: (plotRef: string, input: unknown) => Promise<unknown>;
  };
}) {
  return new TreeSurveysService(
    {
      requireSessionActor:
        overrides?.authService?.requireSessionActor
        ?? (async () => ({
          profileId: 42,
          session: { user: { role: 'owner' } },
        })),
    } as never,
    {
      isConfigured:
        overrides?.bakkiTreeSurvey?.isConfigured
        ?? (() => true),
      listPlots:
        overrides?.bakkiTreeSurvey?.listPlots
        ?? (async () => []),
      getPlot:
        overrides?.bakkiTreeSurvey?.getPlot
        ?? (async () => null),
      createPlot:
        overrides?.bakkiTreeSurvey?.createPlot
        ?? (async () => ({
          plotRef: 'plot-1',
          ranchRef: 'ranch-main',
          name: 'Plot 1',
          description: null,
          areaHectares: 1.2,
          estimate: null,
          createdByUserId: 42,
          geometry: GEOMETRY,
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T10:00:00.000Z',
        })),
      updatePlot:
        overrides?.bakkiTreeSurvey?.updatePlot
        ?? (async () => ({
          plotRef: 'plot-1',
          ranchRef: 'ranch-main',
          name: 'Plot 1',
          description: null,
          areaHectares: 1.2,
          estimate: null,
          createdByUserId: 42,
          geometry: GEOMETRY,
          createdAt: '2026-04-01T10:00:00.000Z',
          updatedAt: '2026-04-01T11:00:00.000Z',
        })),
      listSamples:
        overrides?.bakkiTreeSurvey?.listSamples
        ?? (async () => []),
      recordSample:
        overrides?.bakkiTreeSurvey?.recordSample
        ?? (async () => ({
          id: 'sample-1',
          plotRef: 'plot-1',
          sampledAreaSqm: 100,
          measuredDensityPer100Sqm: 120,
          treeCount: 120,
          meanHeightM: 1.4,
          meanDiameterCm: 2.1,
          sizeDistribution: null,
          sampleGeometry: GEOMETRY,
          actorUserId: 42,
          taskRef: 'task-1',
          notes: null,
          sampledAt: '2026-04-01T11:00:00.000Z',
        })),
      listAreaRollups:
        overrides?.bakkiTreeSurvey?.listAreaRollups
        ?? (async () => new Map()),
      listZoneRollups:
        overrides?.bakkiTreeSurvey?.listZoneRollups
        ?? (async () => new Map()),
    } as never,
  );
}

test('createPlot requires owner role', async () => {
  const service = createTreeSurveysService({
    authService: {
      requireSessionActor: async () => ({
        profileId: 7,
        session: { user: { role: 'planter' } },
      }),
    },
  });

  await assert.rejects(
    () => service.createPlot({ name: 'Plot 1', geometry: GEOMETRY }),
    (error: unknown) =>
      error instanceof ForbiddenException
      && error.message.includes('Only Bakki owners'),
  );
});

test('getPlot throws not found for unknown plot', async () => {
  const service = createTreeSurveysService({
    bakkiTreeSurvey: {
      getPlot: async () => null,
    },
  });

  await assert.rejects(
    () => service.getPlot('missing'),
    (error: unknown) => error instanceof NotFoundException,
  );
});

test('listPlots throws service unavailable when tree surveys are disabled', async () => {
  const service = createTreeSurveysService({
    bakkiTreeSurvey: {
      isConfigured: () => false,
    },
  });

  await assert.rejects(
    () => service.listPlots(),
    (error: unknown) => error instanceof ServiceUnavailableException,
  );
});

test('getAreaRollups maps projected rollup response', async () => {
  const service = createTreeSurveysService({
    bakkiTreeSurvey: {
      listAreaRollups: async () => new Map([
        ['area-1', {
          areaRef: 'area-1',
          zoneRef: 'zone-1',
          overlapAreaSqm: 1000,
          estimatedDensityPer100Sqm: 120,
          estimatedTreeCount: 1200,
          meanHeightM: 1.5,
          meanDiameterCm: 2.4,
          plotCount: 2,
          updatedAt: '2026-04-01T12:00:00.000Z',
        }],
      ]),
    },
  });

  const rollups = await service.getAreaRollups(['area-1']);
  assert.equal(rollups.length, 1);
  assert.equal(rollups[0]?.source, 'plot_estimate_projection');
  assert.equal(rollups[0]?.estimatedTreeCount, 1200);
});

test('recordSample forwards partial-sample estimation inputs', async () => {
  let forwardedInput: unknown = null;
  const service = createTreeSurveysService({
    bakkiTreeSurvey: {
      recordSample: async (_plotRef, input) => {
        forwardedInput = input;
        return {
          id: 'sample-1',
          plotRef: 'plot-1',
          sampledAreaSqm: 50,
          measuredDensityPer100Sqm: 140,
          treeCount: 70,
          meanHeightM: 1.6,
          meanDiameterCm: 2.5,
          sizeDistribution: null,
          sampleGeometry: GEOMETRY,
          actorUserId: 42,
          taskRef: 'task-1',
          notes: null,
          sampledAt: '2026-04-01T11:00:00.000Z',
        };
      },
    },
  });

  await service.recordSample('plot-1', {
    densityPer100Sqm: 140,
    sampledAreaSqm: 50,
    meanHeightM: 1.6,
    meanDiameterCm: 2.5,
    taskRef: 'task-1',
  });

  assert.deepEqual(forwardedInput, {
    actorUserId: 42,
    densityPer100Sqm: 140,
    treeCount: undefined,
    sampledAreaSqm: 50,
    meanHeightM: 1.6,
    meanDiameterCm: 2.5,
    sampleGeometry: undefined,
    sampledAt: undefined,
    notes: undefined,
    taskRef: 'task-1',
    sizeDistribution: undefined,
  });
});

test('getAreaRollups preserves overlap-based heterogeneity fields', async () => {
  const service = createTreeSurveysService({
    bakkiTreeSurvey: {
      listAreaRollups: async () => new Map([
        ['area-hetero', {
          areaRef: 'area-hetero',
          zoneRef: 'zone-1',
          overlapAreaSqm: 3750.25,
          estimatedDensityPer100Sqm: 98.4,
          estimatedTreeCount: 3690,
          meanHeightM: 1.2,
          meanDiameterCm: 2.8,
          plotCount: 3,
          updatedAt: '2026-04-01T13:00:00.000Z',
        }],
      ]),
    },
  });

  const [rollup] = await service.getAreaRollups(['area-hetero']);
  assert.equal(rollup?.overlapAreaSqm, 3750.25);
  assert.equal(rollup?.estimatedDensityPer100Sqm, 98.4);
  assert.equal(rollup?.plotCount, 3);
});
