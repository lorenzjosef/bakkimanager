import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMapManagementHandoffSelection,
  isSameMapSelection,
  parseMapSelection,
  serializeMapSelection,
} from './map-selection';

test('isSameMapSelection compares the full zone and area selection payload', () => {
  assert.equal(
    isSameMapSelection(
      {
        kind: 'area',
        zoneId: 'zone-3',
        zoneName: 'Zone 3',
        areaId: 'area-preview-zone-3',
        areaName: 'Fallback Zone 3 / A-2',
      },
      {
        kind: 'area',
        zoneId: 'zone-3',
        zoneName: 'Zone 3',
        areaId: 'area-preview-zone-3',
        areaName: 'Fallback Zone 3 / A-2',
      },
    ),
    true,
  );

  assert.equal(
    isSameMapSelection(
      {
        kind: 'area',
        zoneId: 'zone-3',
        zoneName: 'Zone 3',
        areaId: 'area-preview-zone-3',
        areaName: 'Fallback Zone 3 / A-2',
      },
      {
        kind: 'zone',
        zoneId: 'zone-3',
        zoneName: 'Zone 3',
        areaId: 'area-preview-zone-3',
        areaName: 'Fallback Zone 3 / A-2',
      },
    ),
    false,
  );
});

test('buildMapManagementHandoffSelection creates an editable area handoff only when an area exists', () => {
  assert.deepEqual(
    buildMapManagementHandoffSelection({
      areaId: 'area-preview-zone-3',
      areaName: 'Fallback Zone 3 / A-2',
      selection: {
        kind: 'area',
        zoneId: 'zone-3',
        zoneName: 'Zone 3',
        areaId: 'area-preview-zone-3',
        areaName: 'Fallback Zone 3 / A-2',
      },
      zoneName: 'Zone 3',
    }),
    {
      kind: 'area',
      zoneId: 'zone-3',
      zoneName: 'Zone 3',
      areaId: 'area-preview-zone-3',
      areaName: 'Fallback Zone 3 / A-2',
    },
  );

  assert.equal(
    buildMapManagementHandoffSelection({
      areaId: null,
      areaName: 'Fallback Zone 3 / A-2',
      selection: {
        kind: 'zone',
        zoneId: 'zone-3',
        zoneName: 'Zone 3',
        areaId: null,
        areaName: null,
      },
      zoneName: 'Zone 3',
    }),
    null,
  );
});

test('parseMapSelection round-trips valid selections and rejects malformed payloads', () => {
  const selection = {
    kind: 'area' as const,
    zoneId: 'zone-3',
    zoneName: 'Zone 3',
    areaId: 'area-preview-zone-3',
    areaName: 'Fallback Zone 3 / A-2',
  };

  assert.deepEqual(parseMapSelection(serializeMapSelection(selection)), selection);
  assert.equal(parseMapSelection('{"kind":"area","zoneId":42}'), null);
  assert.equal(parseMapSelection('not-json'), null);
});
