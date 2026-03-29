import { PageStatePanel } from '@bakki/ui';
import { useMapViewerPageState } from './map-viewer.page-state';
import {
  MapViewerCanvasChrome,
  MapViewerOverlayCard,
} from './map-viewer.sections';

export function MapViewerPage() {
  const {
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
    observationPhotosPending,
    openMapTaskModal,
    ref,
    refetch,
    renderState,
    showRanchLayer,
    showZoneLayer,
    toggleRanchLayer,
    toggleZoneLayer,
    uploadEnabled,
    uploadError,
    uploadFeedback,
    uploadHint,
    uploadInputRef,
    uploadPending,
  } = useMapViewerPageState();

  if (renderState === 'loading') {
    return (
      <section className="view is-active" id="view-map-viewer" ref={ref}>
        <div className="page-content contemporary-map-page map-page-focus">
          <PageStatePanel
            eyebrow="Map Viewer"
            heading="Loading map viewer"
            message="Loading ranch geometry, zones, and the current map overlay data."
          />
        </div>
      </section>
    );
  }

  if (renderState === 'unavailable') {
    return (
      <section className="view is-active" id="view-map-viewer" ref={ref}>
        <div className="page-content contemporary-map-page map-page-focus">
          <PageStatePanel
            action={{ label: 'Retry', onAction: () => void refetch() }}
            eyebrow="Map Viewer"
            heading="Map viewer unavailable"
            message={errorMessage}
            tone="error"
          />
        </div>
      </section>
    );
  }

  if (!mapViewer) {
    return null;
  }

  return (
    <section className="view is-active" id="view-map-viewer" ref={ref}>
      <div className="page-content contemporary-map-page map-page-focus">
        <MapViewerCanvasChrome
          activeSelection={activeSelection}
          focusLegendLabel={focusLegendLabel}
          handleMapControl={handleMapControl}
          isRuntimeReady={isRuntimeReady}
          mapViewer={mapViewer}
          showRanchLayer={showRanchLayer}
          showZoneLayer={showZoneLayer}
          toggleRanchLayer={toggleRanchLayer}
          toggleZoneLayer={toggleZoneLayer}
        >
          {isOverlayVisible && activeOverlay && activeSelection ? (
            <MapViewerOverlayCard
              activeAreaTitle={activeAreaTitle}
              activeOverlay={activeOverlay}
              activeZoneLabel={activeZoneLabel}
              galleryPhotos={galleryPhotos}
              hasGalleryPhotos={hasGalleryPhotos}
              isAreaSelection={isAreaSelection}
              metricsRows={metricsRows}
              observationPhotosPending={observationPhotosPending}
              onClose={closeMapAreaOverlay}
              onCreateTask={() => openMapTaskModal(activeAreaTitle, activeAreaId)}
              onUploadInputChange={handleUploadInputChange}
              uploadEnabled={uploadEnabled}
              uploadError={uploadError}
              uploadFeedback={uploadFeedback}
              uploadHint={uploadHint}
              uploadInputRef={uploadInputRef}
              uploadPending={uploadPending}
            />
          ) : null}
        </MapViewerCanvasChrome>
      </div>
    </section>
  );
}
