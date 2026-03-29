import { mapManagementFixture } from '@bakki/domain';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildZoneSummarySelection,
  buildAreaGeometrySuccessMessage,
  buildAreaMetricsSuccessMessage,
  buildAreaMetricsUpdatePayload,
  createAreaMetricsDraft,
  formatBoundaryCoordinatesFromGeometry,
  formatZoneName,
  resolveInitialManagementSelection,
  resolveMapManagementSecondaryActionLabel,
  resolveMapManagementRenderState,
  resolveOverlayModeFromSelection,
  resolveZoneAreas,
} from './map-management.utils';

test('resolveMapManagementRenderState distinguishes loading, unavailable, and ready states', () => {
  assert.equal(resolveMapManagementRenderState(undefined, true), 'loading');
  assert.equal(resolveMapManagementRenderState(undefined, false), 'unavailable');
  assert.equal(resolveMapManagementRenderState(mapManagementFixture, false), 'ready');
});

test('formatZoneName resolves the visible zone label from a route id', () => {
  assert.equal(formatZoneName(null), 'Zone');
  assert.equal(formatZoneName('zone-4'), 'Zone 4');
  assert.equal(formatZoneName('unexpected'), 'Zone');
});

test('resolveInitialManagementSelection creates a zone-first selection with editable area context', () => {
  const mapManagement = {
    areasById: {},
    zonesById: {
      'zone-9': {
        ...mapManagementFixture.zonesById['zone-1'],
        zoneName: 'Zone 9',
        editableAreaId: 'area-9',
        editableAreaName: 'North Block',
      },
      'zone-10': {
        ...mapManagementFixture.zonesById['zone-2'],
        zoneName: 'Zone 10',
        editableAreaId: 'area-10',
        editableAreaName: 'South Block',
      },
    },
  };

  assert.deepEqual(resolveInitialManagementSelection(mapManagement), {
    kind: 'zone',
    zoneId: 'zone-9',
    zoneName: 'Zone 9',
    areaId: 'area-9',
    areaName: 'North Block',
  });
});

test('buildZoneSummarySelection preserves linked area context while switching back to zone focus', () => {
  assert.deepEqual(
    buildZoneSummarySelection({
      kind: 'area',
      zoneId: 'zone-3',
      zoneName: 'Zone 3',
      areaId: 'area-preview-zone-3',
      areaName: 'Fallback Zone 3 / A-2',
    }),
    {
      kind: 'zone',
      zoneId: 'zone-3',
      zoneName: 'Zone 3',
      areaId: 'area-preview-zone-3',
      areaName: 'Fallback Zone 3 / A-2',
    },
  );

  assert.equal(buildZoneSummarySelection(null), null);
});

test('resolveOverlayModeFromSelection prefers area editor for area selections', () => {
  assert.equal(
    resolveOverlayModeFromSelection({
      kind: 'zone',
      zoneId: 'zone-1',
      zoneName: 'Zone 1',
      areaId: null,
      areaName: null,
    }),
    'zone-info',
  );

  assert.equal(
    resolveOverlayModeFromSelection({
      kind: 'area',
      zoneId: 'zone-1',
      zoneName: 'Zone 1',
      areaId: 'area-1',
      areaName: 'North Block',
    }),
    'area-edit',
  );
});

test('resolveZoneAreas filters and sorts the areas for a selected zone', () => {
  const areas = resolveZoneAreas({
    areasById: {
      'area-b': {
        ...mapManagementFixture.areasById['area-preview-zone-3'],
        areaId: 'area-b',
        areaName: 'Beta',
        zoneId: 'zone-1',
      },
      'area-a': {
        ...mapManagementFixture.areasById['area-preview-zone-3'],
        areaId: 'area-a',
        areaName: 'Alpha',
        zoneId: 'zone-1',
      },
      'area-c': {
        ...mapManagementFixture.areasById['area-preview-zone-3'],
        areaId: 'area-c',
        areaName: 'Gamma',
        zoneId: 'zone-2',
      },
    },
    zonesById: mapManagementFixture.zonesById,
  }, 'zone-1');

  assert.deepEqual(
    areas.map((area) => area.areaId),
    ['area-a', 'area-b'],
  );
});

test('createAreaMetricsDraft converts numeric metrics into input-ready strings', () => {
  assert.deepEqual(
    createAreaMetricsDraft({
      currentDensityPer100Sqm: 28,
      currentTreeCount: 1240,
    }),
    {
      densityInput: '28',
      treeCountInput: '1240',
    },
  );

  assert.deepEqual(
    createAreaMetricsDraft({
      currentDensityPer100Sqm: Number.NaN,
      currentTreeCount: null,
    }),
    {
      densityInput: 'NaN',
      treeCountInput: '',
    },
  );
});

test('buildAreaMetricsUpdatePayload validates density and tree count', () => {
  assert.deepEqual(buildAreaMetricsUpdatePayload('', ''), {
    ok: false,
    error: 'Density must be a positive number.',
  });

  assert.deepEqual(buildAreaMetricsUpdatePayload('18', '-1'), {
    ok: false,
    error: 'Tree count must be zero or a positive number.',
  });

  assert.deepEqual(buildAreaMetricsUpdatePayload('18.5', ''), {
    ok: true,
    payload: {
      densityPer100Sqm: 18.5,
    },
  });

  assert.deepEqual(buildAreaMetricsUpdatePayload('18.5', '1200'), {
    ok: true,
    payload: {
      densityPer100Sqm: 18.5,
      treeCount: 1200,
    },
  });
});

test('resolveMapManagementSecondaryActionLabel keeps idle area navigation separate from edit entry', () => {
  assert.equal(
    resolveMapManagementSecondaryActionLabel({
      hasAnyDraftChanges: true,
      hasEditableArea: true,
      isAreaSelection: true,
      isGeometryEditing: true,
    }),
    'Discard Draft',
  );

  assert.equal(
    resolveMapManagementSecondaryActionLabel({
      hasAnyDraftChanges: false,
      hasEditableArea: true,
      isAreaSelection: true,
      isGeometryEditing: true,
    }),
    'Stop Editing',
  );

  assert.equal(
    resolveMapManagementSecondaryActionLabel({
      hasAnyDraftChanges: false,
      hasEditableArea: true,
      isAreaSelection: true,
      isGeometryEditing: false,
    }),
    'Back to Zone Summary',
  );

  assert.equal(
    resolveMapManagementSecondaryActionLabel({
      hasAnyDraftChanges: false,
      hasEditableArea: true,
      isAreaSelection: false,
      isGeometryEditing: false,
    }),
    'Open Area Editor',
  );
});

test('buildAreaMetricsSuccessMessage rounds the density for UI feedback', () => {
  assert.equal(
    buildAreaMetricsSuccessMessage('Zone 3 Contract Area', 28.4),
    'Updated Zone 3 Contract Area density to 28 / 100m².',
  );
});

test('buildAreaGeometrySuccessMessage reflects persisted vs preview saves', () => {
  assert.equal(
    buildAreaGeometrySuccessMessage('Zone 3 Contract Area'),
    'Updated Zone 3 Contract Area boundary in Bakki Core.',
  );
});

test('formatBoundaryCoordinatesFromGeometry extracts the first polygon ring for the editor card', () => {
  assert.deepEqual(
    formatBoundaryCoordinatesFromGeometry({
      type: 'Polygon',
      coordinates: [[
        [-23.48, 65.84],
        [-23.47, 65.84],
        [-23.47, 65.85],
        [-23.48, 65.84],
      ]],
    }),
    [
      'P1: 65.840000, -23.480000',
      'P2: 65.840000, -23.470000',
      'P3: 65.850000, -23.470000',
      'P4: 65.840000, -23.480000',
    ],
  );
});
