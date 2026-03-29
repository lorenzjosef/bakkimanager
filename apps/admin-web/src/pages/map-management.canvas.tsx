import type { BakkiMapSelection } from '@bakki/map';
import {
  MapLayerIcon,
  MapResetIcon,
  MapToolAreaIcon,
  MapToolNodeIcon,
  MapToolPenIcon,
  MapToolPolygonIcon,
  MapToolZoneIcon,
  MapZoomInIcon,
  MapZoomOutIcon,
} from './map-page.icons';

interface MapManagementCanvasChromeProps {
  activeSelection: BakkiMapSelection | null;
  handleBoundaryResetToolClick: () => void;
  handleBoundaryStopToolClick: () => void;
  handleBoundaryToolClick: () => void;
  handleMapControl: (surface: 'management', action: 'zoom-in' | 'zoom-out' | 'reset') => void;
  hasGeometryDraftChanges: boolean;
  isAreaSelection: boolean;
  isGeometryEditing: boolean;
  onSelectionModeChange: (mode: 'area' | 'zone') => void;
  selectedLayerLabel: string;
  selectionMode: 'area' | 'zone';
  showAreaLayer: boolean;
  showLayerLegend: boolean;
  showRanchLayer: boolean;
  showZoneLayer: boolean;
  toggleAreaLayer: () => void;
  toggleLayerLegend: () => void;
  toggleRanchLayer: () => void;
  toggleZoneLayer: () => void;
}

function ManagementToolButton({
  active = false,
  disabled = false,
  hint,
  icon,
  label,
  onClick,
  type = 'button',
}: {
  active?: boolean;
  disabled?: boolean;
  hint: string;
  icon: JSX.Element;
  label: string;
  onClick: () => void;
  type?: 'button';
}) {
  return (
    <button
      className={`map-management-figma-tool${active ? ' is-active' : ''}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      <span className="map-management-figma-tool-icon">{icon}</span>
      <span className="map-management-figma-tool-copy">
        <span className="map-management-figma-tool-label">{label}</span>
        <span className="map-management-figma-tool-hint">{hint}</span>
      </span>
    </button>
  );
}

export function MapManagementCanvasChrome({
  activeSelection,
  handleBoundaryResetToolClick,
  handleBoundaryStopToolClick,
  handleBoundaryToolClick,
  handleMapControl,
  hasGeometryDraftChanges,
  isAreaSelection,
  isGeometryEditing,
  onSelectionModeChange,
  selectedLayerLabel,
  selectionMode,
  showAreaLayer,
  showLayerLegend,
  showRanchLayer,
  showZoneLayer,
  toggleAreaLayer,
  toggleLayerLegend,
  toggleRanchLayer,
  toggleZoneLayer,
}: MapManagementCanvasChromeProps) {
  return (
    <>
      <div className="map-management-figma-tools">
        <div className="map-management-figma-toolset">
          <ManagementToolButton
            active={selectionMode === 'zone'}
            disabled={isGeometryEditing}
            hint="Click zone boundaries"
            icon={<MapToolZoneIcon />}
            label="Zones"
            onClick={() => onSelectionModeChange('zone')}
          />
          <ManagementToolButton
            active={selectionMode === 'area'}
            disabled={isGeometryEditing}
            hint="Click mapped areas"
            icon={<MapToolAreaIcon />}
            label="Areas"
            onClick={() => onSelectionModeChange('area')}
          />
          <div className="map-management-figma-tool-divider" />
          <ManagementToolButton
            active={isGeometryEditing}
            disabled={!activeSelection || isGeometryEditing}
            hint={activeSelection ? `Edit selected ${isAreaSelection ? 'area' : 'zone'}` : 'Select a feature first'}
            icon={<MapToolPenIcon />}
            label="Edit Boundary"
            onClick={handleBoundaryToolClick}
          />
          <ManagementToolButton
            active={hasGeometryDraftChanges}
            disabled={!isGeometryEditing}
            hint="Clear the draft"
            icon={<MapToolPolygonIcon />}
            label="Reset Draft"
            onClick={handleBoundaryResetToolClick}
          />
          <ManagementToolButton
            active={isGeometryEditing}
            disabled={!isGeometryEditing}
            hint={hasGeometryDraftChanges ? 'Discard the edit' : 'Exit edit mode'}
            icon={<MapToolNodeIcon />}
            label="Stop Editing"
            onClick={handleBoundaryStopToolClick}
          />
        </div>

        <div className="map-management-figma-navset">
          <ManagementToolButton
            hint="Move closer"
            icon={<MapZoomInIcon />}
            label="Zoom In"
            onClick={() => handleMapControl('management', 'zoom-in')}
          />
          <ManagementToolButton
            hint="Move farther away"
            icon={<MapZoomOutIcon />}
            label="Zoom Out"
            onClick={() => handleMapControl('management', 'zoom-out')}
          />
          <ManagementToolButton
            hint="Fit all geometry"
            icon={<MapResetIcon />}
            label="Reset View"
            onClick={() => handleMapControl('management', 'reset')}
          />
        </div>
      </div>

      <div className="map-management-figma-layers">
        <div className="map-management-figma-layer-card" hidden={!showLayerLegend}>
          <button
            aria-pressed={showRanchLayer}
            className={`map-management-figma-layer-item${showRanchLayer ? '' : ' is-muted'}`}
            onClick={toggleRanchLayer}
            type="button"
          >
            <span className="layer-dot layer-dot-ranch" />
            <span>Ranch Boundary</span>
          </button>
          <button
            aria-pressed={showZoneLayer}
            className={`map-management-figma-layer-item${showZoneLayer ? '' : ' is-muted'}`}
            onClick={toggleZoneLayer}
            type="button"
          >
            <span className="layer-dot layer-dot-dashed" />
            <span>Zone Boundary</span>
          </button>
          <button
            aria-pressed={showAreaLayer}
            className={`map-management-figma-layer-item${showAreaLayer ? '' : ' is-muted'}`}
            onClick={toggleAreaLayer}
            type="button"
          >
            <span className="layer-dot layer-dot-area" />
            <span>Area Polygons</span>
          </button>
          <div className={`map-management-figma-layer-item${activeSelection ? '' : ' is-muted'}`}>
            <span className="layer-dot layer-dot-selected" />
            <span>{selectedLayerLabel}</span>
          </div>
        </div>
        <div className="map-management-figma-layer-button">
          <button
            aria-label={showLayerLegend ? 'Hide map legend' : 'Show map legend'}
            aria-pressed={showLayerLegend}
            className={`map-management-figma-tool map-management-figma-tool-small${showLayerLegend ? ' is-active' : ''}`}
            onClick={toggleLayerLegend}
            type="button"
          >
            <MapLayerIcon />
          </button>
        </div>
      </div>

      <div className="map-management-figma-status">
        <div className="map-management-figma-status-item">
          <span>LAT:</span>
          <strong id="map-management-lat">64.1272° N</strong>
        </div>
        <div className="map-management-figma-status-item">
          <span>LON:</span>
          <strong id="map-management-lng">21.8165° W</strong>
        </div>
        <div className="map-management-figma-status-item">
          <span>ELEV:</span>
          <strong id="map-management-elev">142m ASL</strong>
        </div>
      </div>
    </>
  );
}
