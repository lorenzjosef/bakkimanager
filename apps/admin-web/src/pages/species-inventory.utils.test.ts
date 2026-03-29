import assert from 'node:assert/strict';
import test from 'node:test';
import type { SpeciesInventoryData } from '@bakki/domain';
import {
  buildAdjustSpeciesInventoryPayload,
  buildCreateSpeciesPayload,
  buildUpdateSpeciesPayload,
  calculateQuantityDeltaFromTarget,
  calculateProjectedInventory,
  calculateTrayQuantityDelta,
  canSubmitCreateSpecies,
  canSubmitInventoryAdjustment,
  canSubmitUpdateSpecies,
  resolveInventoryAdjustmentQuantityDelta,
  resolveSpeciesInventoryRenderState,
} from './species-inventory.utils';

const speciesInventoryData: SpeciesInventoryData = {
  rows: [],
  syncTitle: 'Bakki Inventory Status',
  syncCopy: 'Species records and inventory changes are stored in Bakki Core.',
};

test('resolveSpeciesInventoryRenderState distinguishes loading, unavailable, and ready states', () => {
  assert.equal(resolveSpeciesInventoryRenderState(undefined, true), 'loading');
  assert.equal(resolveSpeciesInventoryRenderState(undefined, false), 'unavailable');
  assert.equal(resolveSpeciesInventoryRenderState(speciesInventoryData, false), 'ready');
});

test('calculateProjectedInventory parses formatted inventory values and applies valid deltas', () => {
  assert.equal(calculateProjectedInventory('1,240', '15'), 1255);
  assert.equal(calculateProjectedInventory('1,240', 15), 1255);
  assert.equal(calculateProjectedInventory('1,240', ''), 1240);
  assert.equal(calculateProjectedInventory('1,240', null), 1240);
});

test('canSubmitInventoryAdjustment rejects invalid or negative projected stock states', () => {
  assert.equal(canSubmitInventoryAdjustment(null, 100, false), false);
  assert.equal(canSubmitInventoryAdjustment(0, 100, false), false);
  assert.equal(canSubmitInventoryAdjustment(-150, -50, false), false);
  assert.equal(canSubmitInventoryAdjustment(25, 125, true), false);
  assert.equal(canSubmitInventoryAdjustment(25, 125, false), true);
});

test('calculateTrayQuantityDelta multiplies trays by trees per tray', () => {
  assert.equal(calculateTrayQuantityDelta('12', '54'), 648);
  assert.equal(calculateTrayQuantityDelta('', '54'), null);
});

test('calculateQuantityDeltaFromTarget derives the correction from the target stock', () => {
  assert.equal(calculateQuantityDeltaFromTarget('1,240', '1400'), 160);
  assert.equal(calculateQuantityDeltaFromTarget('1,240', ''), null);
});

test('resolveInventoryAdjustmentQuantityDelta switches between add and update workflows', () => {
  assert.equal(
    resolveInventoryAdjustmentQuantityDelta({
      currentInventoryUnits: '1,240',
      mode: 'add',
      targetStock: '',
      trayCount: '12',
      trayMultiple: '54',
    }),
    648,
  );
  assert.equal(
    resolveInventoryAdjustmentQuantityDelta({
      currentInventoryUnits: '1,240',
      mode: 'update',
      targetStock: '1400',
      trayCount: '',
      trayMultiple: '',
    }),
    160,
  );
});

test('buildAdjustSpeciesInventoryPayload trims notes and preserves the selected reason', () => {
  assert.deepEqual(
    buildAdjustSpeciesInventoryPayload('12', 'monitoring', '  post-count correction  '),
    {
      quantityDelta: 12,
      reason: 'monitoring',
      note: 'post-count correction',
    },
  );

  assert.deepEqual(
    buildAdjustSpeciesInventoryPayload('-3', 'adjustment', '   '),
    {
      quantityDelta: -3,
      reason: 'adjustment',
      note: undefined,
    },
  );
});

test('canSubmitCreateSpecies enforces names, stock, and inventory unit', () => {
  assert.equal(canSubmitCreateSpecies('', 'Betula pubescens', '10', 'trees', '54', false), false);
  assert.equal(canSubmitCreateSpecies('Downy Birch', '', '10', 'trees', '54', false), false);
  assert.equal(canSubmitCreateSpecies('Downy Birch', 'Betula pubescens', '-1', 'trees', '54', false), false);
  assert.equal(canSubmitCreateSpecies('Downy Birch', 'Betula pubescens', '10', '', '54', false), false);
  assert.equal(canSubmitCreateSpecies('Downy Birch', 'Betula pubescens', '10', 'trees', '', false), false);
  assert.equal(canSubmitCreateSpecies('Downy Birch', 'Betula pubescens', '10', 'trees', '54', true), false);
  assert.equal(canSubmitCreateSpecies('Downy Birch', 'Betula pubescens', '10', 'trees', '54', false), true);
});

test('buildCreateSpeciesPayload trims optional fields and normalizes quantity', () => {
  assert.deepEqual(
    buildCreateSpeciesPayload({
      areaType: '  Wetlands ',
      botanicalName: 'Betula pubescens',
      code: '  DBR ',
      commonName: 'Downy Birch',
      growthPhase: '  Sapling ',
      initialQuantity: '120',
      inventoryUnit: ' trees ',
      notes: '  Nursery stock batch A ',
      treesPerTray: ' 54 ',
    }),
    {
      areaTypeLabel: 'Wetlands',
      botanicalName: 'Betula pubescens',
      code: 'DBR',
      commonName: 'Downy Birch',
      growthPhaseLabel: 'Sapling',
      initialQuantityOnHand: 120,
      inventoryUnit: 'trees',
      notes: 'Nursery stock batch A',
      treesPerTray: 54,
    },
  );
});

test('canSubmitUpdateSpecies enforces required editable fields', () => {
  assert.equal(canSubmitUpdateSpecies('', 'Betula pubescens', 'trees', '54', false), false);
  assert.equal(canSubmitUpdateSpecies('Downy Birch', '', 'trees', '54', false), false);
  assert.equal(canSubmitUpdateSpecies('Downy Birch', 'Betula pubescens', '', '54', false), false);
  assert.equal(canSubmitUpdateSpecies('Downy Birch', 'Betula pubescens', 'trees', '', false), false);
  assert.equal(canSubmitUpdateSpecies('Downy Birch', 'Betula pubescens', 'trees', '54', true), false);
  assert.equal(canSubmitUpdateSpecies('Downy Birch', 'Betula pubescens', 'trees', '54', false), true);
});

test('buildUpdateSpeciesPayload trims optional update fields', () => {
  assert.deepEqual(
    buildUpdateSpeciesPayload({
      areaType: '  Basalt Slopes ',
      botanicalName: 'Betula pubescens',
      commonName: 'Downy Birch',
      growthPhase: '  Juvenile ',
      inventoryUnit: ' trees ',
      notes: '  Adjusted for spring cycle ',
      treesPerTray: ' 67 ',
    }),
    {
      areaTypeLabel: 'Basalt Slopes',
      botanicalName: 'Betula pubescens',
      commonName: 'Downy Birch',
      growthPhaseLabel: 'Juvenile',
      inventoryUnit: 'trees',
      notes: 'Adjusted for spring cycle',
      treesPerTray: 67,
    },
  );
});
