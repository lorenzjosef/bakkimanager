import type { ChangeEvent, ReactNode, RefObject } from 'react';
import { localAssetUrls, type MapViewerData, type MapViewerOverlayData } from '@bakki/domain';
import type { BakkiMapSelection } from '@bakki/map';
import {
  EmptyStatePanel,
  InlineStatusBanner,
} from '@bakki/ui';
import type { MapViewerGalleryPhoto } from './map-viewer.utils';
import {
  MapCloseIcon,
  MapTaskCreateIcon,
} from './map-page.icons';

interface MapViewerCanvasChromeProps {
  activeSelection: BakkiMapSelection | null;
  children?: ReactNode;
  focusLegendLabel: string;
  handleMapControl: (surface: 'viewer', action: 'zoom-in' | 'zoom-out' | 'reset') => void;
  isRuntimeReady: boolean;
  mapViewer: MapViewerData;
  showRanchLayer: boolean;
  showZoneLayer: boolean;
  toggleRanchLayer: () => void;
  toggleZoneLayer: () => void;
}

export function MapViewerCanvasChrome({
  activeSelection,
  children,
  focusLegendLabel,
  handleMapControl,
  isRuntimeReady,
  mapViewer,
  showRanchLayer,
  showZoneLayer,
  toggleRanchLayer,
  toggleZoneLayer,
}: MapViewerCanvasChromeProps) {
  return (
    <section className="map-focus-shell">
      <div className="map-focus-card">
        <div className="contemporary-map-canvas map-focus-canvas">
          <div className="map-focus-topbar">
            <div className="map-tool-pills">
              <button
                aria-pressed={showRanchLayer}
                className={`map-pill map-pill-button${showRanchLayer ? ' map-pill-active' : ''}`}
                onClick={toggleRanchLayer}
                type="button"
              >
                Ranch
              </button>
              <button
                aria-pressed={showZoneLayer}
                className={`map-pill map-pill-button${showZoneLayer ? ' map-pill-active' : ''}`}
                onClick={toggleZoneLayer}
                type="button"
              >
                Zones
              </button>
              <span className="map-pill">Read Only</span>
            </div>
            <div className="map-count-strip">
              <span id="map-zone-count">{mapViewer.zoneCountLabel}</span>
              <span id="map-area-count">{mapViewer.ranchCountLabel}</span>
            </div>
          </div>

          <div className="map-focus-hint" id="map-focus-hint">
            {mapViewer.defaultHint}
          </div>

          <div className="contemporary-map-controls">
            <button onClick={() => handleMapControl('viewer', 'zoom-in')} type="button">+</button>
            <button onClick={() => handleMapControl('viewer', 'zoom-out')} type="button">-</button>
            <button onClick={() => handleMapControl('viewer', 'reset')} type="button">O</button>
          </div>

          <div className="leaflet-map-surface" id="map-viewer-live-map" aria-label="Interactive zone and area map" />
          {!isRuntimeReady ? (
            <div aria-live="polite" className="map-runtime-loading" role="status">
              <div className="map-runtime-loading-card">
                <span className="map-runtime-loading-eyebrow">Interactive Map</span>
                <strong>Preparing live terrain</strong>
                <span>Loading ranch, zone, and area layers.</span>
              </div>
            </div>
          ) : null}

          <div className="contemporary-map-legend">
            <div className="legend-title">Map Legend</div>
            <div className={`legend-row${showRanchLayer ? '' : ' is-muted'}`}>
              <span className="legend-swatch legend-swatch-ranch" />
              <span>Ranch Boundary</span>
            </div>
            <div className={`legend-row${showZoneLayer ? '' : ' is-muted'}`}>
              <span className="legend-swatch legend-swatch-zone" />
              <span>Zone Boundary</span>
            </div>
            <div className={`legend-row${activeSelection && showZoneLayer ? '' : ' is-muted'}`}>
              <span className={`legend-swatch ${activeSelection && showZoneLayer ? 'legend-swatch-active' : 'legend-swatch-selected'}`} />
              <span>{focusLegendLabel}</span>
            </div>
          </div>

          <div className="contemporary-map-coordinates">
            <span>Coordinates</span>
            <strong id="map-viewer-coordinates">{mapViewer.defaultCoordinates}</strong>
          </div>

          <div className="contemporary-map-badge">Map Focus</div>
          {children}
        </div>
      </div>
    </section>
  );
}

interface MapViewerOverlayCardProps {
  activeAreaTitle: string;
  activeOverlay: MapViewerOverlayData;
  activeZoneLabel: string;
  galleryPhotos: MapViewerGalleryPhoto[];
  hasGalleryPhotos: boolean;
  isAreaSelection: boolean;
  metricsRows: Array<{ label: string; value: string; tone?: 'neutral' | 'positive' | 'emphasis' }>;
  observationPhotosPending: boolean;
  onClose: () => void;
  onCreateTask: () => void;
  onUploadInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  uploadEnabled: boolean;
  uploadError: string | null;
  uploadFeedback: string | null;
  uploadHint: string;
  uploadInputRef: RefObject<HTMLInputElement | null>;
  uploadPending: boolean;
}

export function MapViewerOverlayCard({
  activeAreaTitle,
  activeOverlay,
  activeZoneLabel,
  galleryPhotos,
  hasGalleryPhotos,
  isAreaSelection,
  metricsRows,
  observationPhotosPending,
  onClose,
  onCreateTask,
  onUploadInputChange,
  uploadEnabled,
  uploadError,
  uploadFeedback,
  uploadHint,
  uploadInputRef,
  uploadPending,
}: MapViewerOverlayCardProps) {
  return (
    <div className="map-area-overlay" id="map-area-overlay">
      <article className="map-area-figma-card" data-node-id="58:1510">
        <header className="map-area-figma-header" data-node-id="58:1512">
          <div className="map-area-figma-heading">
            <div className="map-area-figma-zone">{activeZoneLabel}</div>
            <h2 id="map-area-title">
              {isAreaSelection ? `Area: ${activeAreaTitle}` : activeZoneLabel}
            </h2>
          </div>
          <button
            aria-label={isAreaSelection ? 'Close area details' : 'Close zone details'}
            className="map-area-figma-close"
            onClick={onClose}
            type="button"
          >
            <MapCloseIcon />
          </button>
        </header>

        <div className="map-area-figma-body" id="map-area-content" data-node-id="58:1519">
          <div className="map-card-action-strip is-single">
            <button
              className="primary-sidebar-button contemporary-cta map-card-action-button"
              onClick={onCreateTask}
              type="button"
            >
              <MapTaskCreateIcon />
              <span>Create Task</span>
            </button>
          </div>

          <section className="map-area-figma-stats" data-node-id="58:1520">
            <article className="map-area-figma-stat">
              <div className="map-area-figma-stat-label">{activeOverlay.speciesLabel}</div>
              <div className="map-area-figma-stat-row">
                <img src={localAssetUrls.mapAreaSpecies} alt="" />
                <strong>{activeOverlay.speciesValue}</strong>
              </div>
            </article>
            <article className="map-area-figma-stat">
              <div className="map-area-figma-stat-label">{activeOverlay.estimatedCountLabel}</div>
              <div className="map-area-figma-stat-row">
                <img src={localAssetUrls.mapAreaCount} alt="" />
                <strong>{activeOverlay.estimatedCountValue}</strong>
              </div>
            </article>
          </section>

          <section className="map-area-figma-metrics" data-node-id="58:1535">
            <h3>{isAreaSelection ? activeOverlay.metricsTitle : 'Zone Metrics'}</h3>
            {metricsRows.map((metric) => (
              <div className="map-area-figma-metric-row" key={metric.label}>
                <span>{metric.label}</span>
                <strong
                  className={
                    metric.tone === 'positive'
                      ? 'metric-positive'
                      : metric.tone === 'emphasis'
                        ? 'metric-positive metric-emphasis'
                        : undefined
                  }
                >
                  {metric.value}
                </strong>
              </div>
            ))}
          </section>

          <section className="map-area-figma-photos" data-node-id="58:1559">
            <div className="map-area-figma-photos-head">
              <h3>{activeOverlay.photosTitle}</h3>
              {isAreaSelection ? (
                <button
                  className="map-area-figma-upload"
                  disabled={!uploadEnabled || uploadPending}
                  onClick={() => uploadInputRef.current?.click()}
                  type="button"
                >
                  {uploadPending ? 'Uploading...' : 'Upload Photo'}
                </button>
              ) : null}
            </div>
            {uploadError ? (
              <InlineStatusBanner
                heading="Upload failed"
                message={uploadError}
                tone="error"
              />
            ) : null}
            {uploadFeedback ? (
              <InlineStatusBanner
                heading="Upload complete"
                message={uploadFeedback}
                tone="neutral"
              />
            ) : null}
            {observationPhotosPending ? (
              <InlineStatusBanner
                heading="Loading photos"
                message="Loading the latest observation photos for this selection."
                tone="neutral"
              />
            ) : null}
            {isAreaSelection && !uploadEnabled ? (
              <InlineStatusBanner
                heading="Upload unavailable"
                message={uploadHint}
                tone="warning"
              />
            ) : null}
            <input
              accept="image/*"
              className="map-area-figma-upload-input"
              onChange={onUploadInputChange}
              ref={uploadInputRef as RefObject<HTMLInputElement>}
              type="file"
            />
            <div className="map-area-figma-photo-grid">
              {hasGalleryPhotos ? (
                galleryPhotos.map((photo) => (
                  <img key={photo.alt} src={photo.src} alt={photo.alt} />
                ))
              ) : (
                <EmptyStatePanel
                  className="bakki-card-empty-state"
                  heading="No field photos yet"
                  message="No observation photos are linked to this selection yet."
                />
              )}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
