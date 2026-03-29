import assert from 'node:assert/strict';
import test from 'node:test';
import type { MapViewerData, MediaAssetRecord } from '@bakki/domain';
import {
  buildMapViewerFocusLegendLabel,
  buildMapViewerGalleryPhotos,
  buildMapViewerMetricsRows,
  buildMapViewerTitle,
  buildMapViewerUploadHint,
  canOpenMapViewerAreaDetails,
  canUploadObservationPhoto,
  resolveMapViewerAreaFocus,
  resolveMapViewerOverlay,
} from './map-viewer.utils';

const mapViewerData: MapViewerData = {
  zoneCountLabel: '1 Zone',
  ranchCountLabel: 'Bakki Ranch',
  defaultHint: 'Click a zone or area to inspect live details.',
  defaultCoordinates: 'Unavailable',
  zoneOverlaysByZoneId: {
    'zone-3': {
      zoneId: 'zone-3',
      zoneLabel: 'Zone 3',
      title: 'Zone 3',
      focusAreaId: 'area-3',
      focusAreaName: 'Area 3',
      observationOwnerId: null,
      densityLabel: 'Average Density',
      densityValue: '28 / 100m²',
      densitySupport: 'Average density derived from 1 mapped area in this zone',
      contractLabel: 'Contract Fulfillment',
      contractValue: '1,240 / 1,500 trees',
      contractSupport: '1,240 of 1,500 trees recorded across the zone contracts',
      speciesLabel: 'Contract Goal',
      speciesValue: '1,500 trees',
      estimatedCountLabel: 'Contract Fulfillment',
      estimatedCountValue: '1,240 / 1,500 trees',
      metricsTitle: 'Zone Metrics',
      metrics: [
        { label: 'Mapped Areas', value: '1' },
      ],
      photosTitle: 'Field Photos',
      photos: [],
    },
  },
  areaOverlaysByAreaId: {
    'area-3': {
      zoneId: 'zone-3',
      zoneLabel: 'Zone 3',
      title: 'Area 3',
      focusAreaId: 'area-3',
      focusAreaName: 'Area 3',
      observationOwnerId: 'observation-7',
      densityLabel: 'Current Density',
      densityValue: '28 / 100m²',
      densitySupport: 'Latest monitored estimate: 1,240 trees in this area',
      contractLabel: 'Trees Planted',
      contractValue: '1,240 trees',
      contractSupport: '1,240 trees are currently recorded for this area',
      speciesLabel: 'Assigned Sapling',
      speciesValue: 'Downy Birch',
      estimatedCountLabel: 'Trees Planted',
      estimatedCountValue: '1,240 trees',
      metricsTitle: 'Area Metrics',
      metrics: [
        { label: 'Planted By', value: 'Lorenz Bauer' },
      ],
      photosTitle: 'Field Photos',
      photos: [],
    },
  },
};

function createObservationPhoto(overrides: Partial<MediaAssetRecord> = {}): MediaAssetRecord {
  return {
    id: 'photo-1',
    ownerType: 'observation',
    ownerId: 3001,
    name: 'Canopy Scan',
    fileName: 'canopy-scan.jpg',
    mimeType: 'image/jpeg',
    caption: null,
    assetUrl: 'https://cdn.bakki.test/canopy-scan.jpg',
    objectKey: 'observation/3001/canopy-scan.jpg',
    ...overrides,
  };
}

test('resolveMapViewerOverlay selects zone and area overlays from the live data structure', () => {
  const zoneOverlay = resolveMapViewerOverlay(mapViewerData, {
    kind: 'zone',
    zoneId: 'zone-3',
    zoneName: 'Zone 3',
    areaId: null,
    areaName: null,
  });
  const areaOverlay = resolveMapViewerOverlay(mapViewerData, {
    kind: 'area',
    zoneId: 'zone-3',
    zoneName: 'Zone 3',
    areaId: 'area-3',
    areaName: 'Area 3',
  });

  assert.equal(zoneOverlay?.title, 'Zone 3');
  assert.equal(areaOverlay?.title, 'Area 3');
});

test('resolveMapViewerOverlay returns null for missing viewer data or unknown selections', () => {
  assert.equal(resolveMapViewerOverlay(null, null), null);
  assert.equal(resolveMapViewerOverlay(mapViewerData, {
    kind: 'zone',
    zoneId: 'zone-missing',
    zoneName: 'Missing',
    areaId: null,
    areaName: null,
  }), null);
});

test('resolveMapViewerAreaFocus prefers the selected area and otherwise falls back to the overlay focus area', () => {
  assert.deepEqual(
    resolveMapViewerAreaFocus(
      {
        kind: 'area',
        zoneId: 'zone-3',
        zoneName: 'Zone 3',
        areaId: 'area-3',
        areaName: 'Area 3',
      },
      mapViewerData.areaOverlaysByAreaId['area-3'],
    ),
    { areaId: 'area-3', areaName: 'Area 3' },
  );
  assert.deepEqual(
    resolveMapViewerAreaFocus(
      {
        kind: 'zone',
        zoneId: 'zone-3',
        zoneName: 'Zone 3',
        areaId: null,
        areaName: null,
      },
      mapViewerData.zoneOverlaysByZoneId['zone-3'],
    ),
    { areaId: 'area-3', areaName: 'Area 3' },
  );
});

test('buildMapViewerGalleryPhotos returns empty when there are no live photos', () => {
  assert.deepEqual(buildMapViewerGalleryPhotos(undefined), []);
});

test('buildMapViewerGalleryPhotos only uses live asset urls', () => {
  const galleryPhotos = buildMapViewerGalleryPhotos([
    createObservationPhoto(),
    createObservationPhoto({
      id: 'photo-2',
      name: '',
      fileName: '',
      assetUrl: null,
    }),
  ]);

  assert.deepEqual(galleryPhotos, [{
    alt: 'Canopy Scan',
    src: 'https://cdn.bakki.test/canopy-scan.jpg',
  }]);
});

test('canOpenMapViewerAreaDetails reflects whether the overlay exposes a focus area', () => {
  assert.equal(canOpenMapViewerAreaDetails(mapViewerData.zoneOverlaysByZoneId['zone-3']), true);
  assert.equal(canOpenMapViewerAreaDetails({
    ...mapViewerData.zoneOverlaysByZoneId['zone-3'],
    focusAreaId: null,
  }), false);
});

test('canUploadObservationPhoto requires an observation owner plus session and provider readiness', () => {
  assert.equal(canUploadObservationPhoto('observation-7', true, true), true);
  assert.equal(canUploadObservationPhoto(null, true, true), false);
  assert.equal(canUploadObservationPhoto('observation-7', false, true), false);
  assert.equal(canUploadObservationPhoto('observation-7', true, false), false);
});

test('buildMapViewerFocusLegendLabel reflects zone and area focus states', () => {
  assert.equal(buildMapViewerFocusLegendLabel(null), 'Focused Zone');
  assert.equal(
    buildMapViewerFocusLegendLabel({
      kind: 'area',
      zoneId: 'zone-3',
      zoneName: 'Zone 3',
      areaId: 'area-3',
      areaName: 'Area 3',
    }),
    'Focused Area',
  );
});

test('buildMapViewerUploadHint prefers missing-observation guidance before provider hints', () => {
  assert.equal(
    buildMapViewerUploadHint(null, true, 'Spaces configured.'),
    'No observation record is linked to this selection yet.',
  );
  assert.equal(
    buildMapViewerUploadHint('observation-7', false, 'Spaces configured.'),
    'Sign-in session is still initializing for media access.',
  );
  assert.equal(
    buildMapViewerUploadHint('observation-7', true, 'Spaces configured.'),
    'Spaces configured.',
  );
});

test('buildMapViewerMetricsRows keeps density ahead of detail rows without duplicating contract copy', () => {
  const metrics = buildMapViewerMetricsRows(mapViewerData.areaOverlaysByAreaId['area-3']);

  assert.equal(metrics[0]?.label, 'Current Density');
  assert.equal(metrics[1]?.label, 'Planted By');
});

test('buildMapViewerTitle respects zone-vs-area presentation', () => {
  assert.deepEqual(
    buildMapViewerTitle(
      {
        kind: 'zone',
        zoneId: 'zone-3',
        zoneName: 'Zone 3',
        areaId: null,
        areaName: null,
      },
      mapViewerData.zoneOverlaysByZoneId['zone-3'],
    ),
    {
      areaTitle: 'Zone 3',
      isAreaSelection: false,
      zoneLabel: 'Zone 3',
    },
  );
  assert.deepEqual(
    buildMapViewerTitle(
      {
        kind: 'area',
        zoneId: 'zone-3',
        zoneName: 'Zone 3',
        areaId: 'area-3',
        areaName: 'Area 3',
      },
      mapViewerData.areaOverlaysByAreaId['area-3'],
    ),
    {
      areaTitle: 'Area 3',
      isAreaSelection: true,
      zoneLabel: 'Zone 3',
    },
  );
});
