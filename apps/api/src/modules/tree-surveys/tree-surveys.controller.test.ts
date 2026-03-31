import assert from 'node:assert/strict';
import test from 'node:test';
import { TreeSurveysController } from './tree-surveys.controller';

test('parseCsvQuery-style rollup routes forward trimmed ids to service', async () => {
  const calls: Array<{ type: 'areas' | 'zones'; ids: string[] }> = [];
  const controller = new TreeSurveysController({
    getAreaRollups: async (ids: string[]) => {
      calls.push({ type: 'areas', ids });
      return [];
    },
    getZoneRollups: async (ids: string[]) => {
      calls.push({ type: 'zones', ids });
      return [];
    },
    getPlot: async () => null,
    listPlots: async () => [],
    listSamples: async () => [],
    createPlot: async () => null,
    updatePlot: async () => null,
    recordSample: async () => null,
  } as never);

  await controller.getAreaRollups(' area-1 , , area-2 ');
  await controller.getZoneRollups(' zone-1,zone-2 ');

  assert.deepEqual(calls, [
    { type: 'areas', ids: ['area-1', 'area-2'] },
    { type: 'zones', ids: ['zone-1', 'zone-2'] },
  ]);
});

test('rollup routes return empty ids when query is omitted', async () => {
  const calls: Array<{ type: 'areas' | 'zones'; ids: string[] }> = [];
  const controller = new TreeSurveysController({
    getAreaRollups: async (ids: string[]) => {
      calls.push({ type: 'areas', ids });
      return [];
    },
    getZoneRollups: async (ids: string[]) => {
      calls.push({ type: 'zones', ids });
      return [];
    },
    getPlot: async () => null,
    listPlots: async () => [],
    listSamples: async () => [],
    createPlot: async () => null,
    updatePlot: async () => null,
    recordSample: async () => null,
  } as never);

  await controller.getAreaRollups(undefined);
  await controller.getZoneRollups(undefined);

  assert.deepEqual(calls, [
    { type: 'areas', ids: [] },
    { type: 'zones', ids: [] },
  ]);
});
