import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useInteractiveMaps } from '@/hooks/useInteractiveMaps';
import { useSessionStatus } from '@/queries/auth';
import {
  useAreaGeometryData,
  useMapViewerData,
  useRanchGeometryData,
  useZoneGeometryData,
} from '@/queries/map';
import {
  useMediaStatus,
  useObservationPhotos,
  useUploadObservationPhotoMutation,
} from '@/queries/media';
import { useUIStore } from '@/store/ui';
import {
  buildMapViewerFocusLegendLabel,
  buildMapViewerGalleryPhotos,
  buildMapViewerMetricsRows,
  buildMapViewerTitle,
  buildMapViewerUploadHint,
  canUploadObservationPhoto,
  hasMapViewerPhotos,
  resolveMapViewerAreaFocus,
  resolveMapViewerOverlay,
} from './map-viewer.utils';

export function useMapViewerPageState() {
  const ref = useRef<HTMLElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const mapAreaOverlayOpen = useUIStore((state) => state.mapAreaOverlayOpen);
  const selectedViewerMapSelection = useUIStore((state) => state.selectedViewerMapSelection);
  const openMapAreaOverlay = useUIStore((state) => state.openMapAreaOverlay);
  const openMapTaskModal = useUIStore((state) => state.openMapTaskModal);
  const closeMapAreaOverlay = useUIStore((state) => state.closeMapAreaOverlay);
  const setSelectedViewerMapSelection = useUIStore((state) => state.setSelectedViewerMapSelection);
  const ranchGeometryQuery = useRanchGeometryData();
  const zoneGeometryQuery = useZoneGeometryData();
  const areaGeometryQuery = useAreaGeometryData();
  const sessionQuery = useSessionStatus();
  const {
    data: mapViewer,
    error: mapViewerError,
    isPending,
    refetch,
  } = useMapViewerData();
  const { handleMapControl, isRuntimeReady, setMapLayerVisibility } = useInteractiveMaps(
    'map-viewer',
    ref,
    {
      areasGeoJson: areaGeometryQuery.data ?? null,
      ranchGeoJson: ranchGeometryQuery.data ?? null,
      zonesGeoJson: zoneGeometryQuery.data ?? null,
    },
    Boolean(mapViewer),
  );
  const mediaStatus = useMediaStatus();
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showRanchLayer, setShowRanchLayer] = useState(true);
  const [showZoneLayer, setShowZoneLayer] = useState(true);
  const activeSelection = selectedViewerMapSelection;
  const activeOverlay = resolveMapViewerOverlay(mapViewer, activeSelection);
  const isOverlayVisible = mapAreaOverlayOpen && Boolean(activeSelection && activeOverlay);
  const observationOwnerId = isOverlayVisible ? activeOverlay?.observationOwnerId ?? null : null;
  const isSessionReadyForMedia = Boolean(sessionQuery.data?.session?.authenticated);
  const observationPhotosQuery = useObservationPhotos(observationOwnerId, isSessionReadyForMedia);
  const uploadObservationPhoto = useUploadObservationPhotoMutation(observationOwnerId);

  useEffect(() => {
    setUploadFeedback(null);
    setUploadError(null);
  }, [activeSelection?.areaId, activeSelection?.kind, activeSelection?.zoneId]);

  useEffect(() => {
    setMapLayerVisibility('viewer', 'ranch', showRanchLayer);
  }, [setMapLayerVisibility, showRanchLayer]);

  useEffect(() => {
    setMapLayerVisibility('viewer', 'zones', showZoneLayer);
    setMapLayerVisibility('viewer', 'areas', showZoneLayer);
  }, [setMapLayerVisibility, showZoneLayer]);

  const renderState = isPending && !mapViewer
    ? 'loading'
    : mapViewer
      ? 'ready'
      : 'unavailable';
  const errorMessage = mapViewerError instanceof Error
    ? mapViewerError.message
    : 'The map viewer data could not be loaded.';
  const { areaId: activeAreaId, areaName: activeAreaName } = resolveMapViewerAreaFocus(activeSelection, activeOverlay);
  const { areaTitle: activeAreaTitle, isAreaSelection, zoneLabel: activeZoneLabel } = buildMapViewerTitle(
    activeSelection,
    activeOverlay,
  );
  const galleryPhotos = activeOverlay
    ? buildMapViewerGalleryPhotos(observationPhotosQuery.data)
    : [];
  const hasGalleryPhotos = hasMapViewerPhotos(galleryPhotos);
  const uploadEnabled = canUploadObservationPhoto(
    observationOwnerId,
    isSessionReadyForMedia,
    mediaStatus.data?.supportsDirectUploadSigning ?? false,
  );
  const uploadHint = buildMapViewerUploadHint(
    observationOwnerId,
    isSessionReadyForMedia,
    mediaStatus.data?.message,
  );
  const focusLegendLabel = buildMapViewerFocusLegendLabel(activeSelection);
  const metricsRows = buildMapViewerMetricsRows(activeOverlay);

  const handleUploadInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) {
      return;
    }

    setUploadFeedback(null);
    setUploadError(null);
    void uploadObservationPhoto.mutateAsync({
      caption: activeAreaTitle,
      displayName: file.name.replace(/\.[^.]+$/, ''),
      file,
    }).then((result) => {
      setUploadFeedback(`${result.photo.name} uploaded.`);
    }).catch((error) => {
      setUploadError(error instanceof Error ? error.message : 'The photo could not be uploaded.');
    });
  };

  return {
    activeAreaId,
    activeAreaTitle,
    activeOverlay,
    activeSelection,
    activeZoneLabel,
    closeMapAreaOverlay,
    errorMessage,
    focusLegendLabel,
    galleryPhotos,
    handleMapControl,
    handleUploadInputChange,
    hasGalleryPhotos,
    isAreaSelection,
    isOverlayVisible,
    isRuntimeReady,
    mapViewer,
    metricsRows,
    observationPhotosPending: observationPhotosQuery.isPending,
    openMapTaskModal,
    ref,
    refetch,
    renderState,
    showRanchLayer,
    showZoneLayer,
    toggleRanchLayer: () => setShowRanchLayer((value) => !value),
    toggleZoneLayer: () => setShowZoneLayer((value) => !value),
    uploadEnabled,
    uploadError,
    uploadFeedback,
    uploadHint,
    uploadInputRef,
    uploadPending: uploadObservationPhoto.isPending,
  };
}
