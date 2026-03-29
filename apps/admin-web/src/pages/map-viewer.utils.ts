import type { MapViewerData, MapViewerOverlayData, MediaAssetRecord } from '@bakki/domain';
import type { BakkiMapSelection } from '@bakki/map';

export interface MapViewerGalleryPhoto {
  alt: string;
  src: string;
}

export function resolveMapViewerOverlay(
  mapViewer: MapViewerData | null | undefined,
  selection: BakkiMapSelection | null | undefined,
): MapViewerOverlayData | null {
  if (!mapViewer || !selection) {
    return null;
  }

  if (selection.kind === 'area' && selection.areaId) {
    return mapViewer.areaOverlaysByAreaId[selection.areaId] ?? null;
  }

  return mapViewer.zoneOverlaysByZoneId[selection.zoneId] ?? null;
}

export function buildMapViewerGalleryPhotos(
  observationPhotos: MediaAssetRecord[] | undefined,
): MapViewerGalleryPhoto[] {
  if (!observationPhotos || observationPhotos.length === 0) {
    return [];
  }

  return observationPhotos.map((photo, index) => ({
    alt: photo.name || photo.fileName || `Observation photo ${index + 1}`,
    src: photo.assetUrl || '',
  })).filter((photo) => Boolean(photo.src));
}

export function resolveMapViewerAreaFocus(
  selection: BakkiMapSelection | null | undefined,
  overlay: MapViewerOverlayData | null | undefined,
) {
  if (!overlay) {
    return {
      areaId: selection?.kind === 'area' ? selection.areaId : null,
      areaName: selection?.kind === 'area' ? selection.areaName : null,
    };
  }

  return {
    areaId: selection?.kind === 'area' ? selection.areaId : overlay.focusAreaId,
    areaName: selection?.kind === 'area' ? selection.areaName : overlay.focusAreaName,
  };
}

export function canOpenMapViewerAreaDetails(
  overlay: MapViewerOverlayData | null | undefined,
) {
  return Boolean(overlay?.focusAreaId);
}

export function canUploadObservationPhoto(
  observationOwnerId: string | null,
  isSessionReadyForMedia: boolean,
  supportsDirectUploadSigning: boolean,
) {
  return Boolean(observationOwnerId) && isSessionReadyForMedia && supportsDirectUploadSigning;
}

export function buildMapViewerFocusLegendLabel(selection: BakkiMapSelection | null | undefined) {
  return selection?.kind === 'area' ? 'Focused Area' : 'Focused Zone';
}

export function buildMapViewerUploadHint(
  observationOwnerId: string | null,
  isSessionReadyForMedia: boolean,
  providerMessage: string | null | undefined,
) {
  if (!observationOwnerId) {
    return 'No observation record is linked to this selection yet.';
  }

  if (!isSessionReadyForMedia) {
    return 'Sign-in session is still initializing for media access.';
  }

  return providerMessage ?? 'Checking upload provider status.';
}

export function hasMapViewerPhotos(photos: MapViewerGalleryPhoto[]) {
  return photos.length > 0;
}

export function buildMapViewerMetricsRows(
  overlay: MapViewerOverlayData | null | undefined,
) {
  if (!overlay) {
    return [];
  }

  return [
    {
      label: overlay.densityLabel,
      value: overlay.densityValue,
      tone: 'positive' as const,
    },
    ...overlay.metrics,
  ];
}

export function buildMapViewerTitle(
  selection: BakkiMapSelection | null | undefined,
  overlay: MapViewerOverlayData | null | undefined,
) {
  if (!selection || !overlay) {
    return {
      areaTitle: 'Zone',
      isAreaSelection: false,
      zoneLabel: 'Zone',
    };
  }

  const zoneLabel = selection.zoneName ?? overlay.zoneLabel ?? 'Zone';
  const areaTitle = selection.kind === 'area'
    ? selection.areaName ?? overlay.title ?? zoneLabel
    : overlay.title ?? zoneLabel;

  return {
    areaTitle,
    isAreaSelection: selection.kind === 'area',
    zoneLabel,
  };
}
