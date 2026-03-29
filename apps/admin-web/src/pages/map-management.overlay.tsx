import type { ReactNode } from 'react';
import type { MapManagementAreaFixture, MapManagementZoneFixture } from '@bakki/domain';
import type { BakkiMapSelection } from '@bakki/map';
import { InlineStatusBanner } from '@bakki/ui';
import type { MapManagementOverlayMode } from './map-management.utils';
import {
  MapCloseIcon,
  MapGeometryEditIcon,
  MapSaveIcon,
  MapTaskCreateIcon,
  MapVerifiedIcon,
} from './map-page.icons';

interface MapManagementOverlayCardProps {
  activeSelection: BakkiMapSelection | null;
  areaDetail: MapManagementAreaFixture | null;
  areaDefinitionStatus: string;
  areaNameInput: string;
  boundaryCoordinates: string[];
  closeManagementOverlay: () => void;
  densityInput: string;
  editableAreaName: string;
  hasAnyDraftChanges: boolean;
  hasEditableArea: boolean;
  hoveredAreaId: string | null;
  isCreatingArea: boolean;
  isDeletingArea: boolean;
  isGeometryDrawing: boolean;
  isGeometryEditing: boolean;
  isSaving: boolean;
  notesValue: string;
  onAreaHoverChange: (areaId: string | null) => void;
  onAreaNameInputChange: (value: string) => void;
  onCreateArea: () => void;
  onDeleteArea: () => void;
  onDensityInputChange: (value: string) => void;
  onFinishGeometryDraw: () => void;
  onOpenAreaEditor: (areaId: string, areaName: string) => void;
  onOpenCreateAreaCard: () => void;
  onOpenEditAreasCard: () => void;
  onOpenZoneInfoCard: () => void;
  onResetGeometryEdit: () => void;
  onSave: () => void;
  onStartGeometryEdit: () => void;
  onTreeCountInputChange: (value: string) => void;
  overlayMode: MapManagementOverlayMode;
  saveError: string | null;
  saveSuccess: string | null;
  treeCountInput: string;
  zoneAreas: MapManagementAreaFixture[];
  zoneDetail: MapManagementZoneFixture | null;
  zoneKey: string | null;
  zoneName: string;
}

function OverlayShell({
  badge,
  children,
  closeManagementOverlay,
  heading,
  saveError,
  saveSuccess,
  subheading,
}: {
  badge: string;
  children: ReactNode;
  closeManagementOverlay: () => void;
  heading: string;
  saveError: string | null;
  saveSuccess: string | null;
  subheading: string;
}) {
  return (
    <article
      className="map-management-figma-properties map-management-figma-properties-pop"
      data-node-id="60:4123"
    >
      <div className="map-management-figma-properties-body">
        <div className="map-management-figma-properties-head">
          <div>
            <div className="map-management-figma-properties-eyebrow">{subheading}</div>
            <h2 id="map-management-area-title">{heading}</h2>
          </div>
          <div className="map-management-figma-properties-actions">
            <span className="map-management-figma-badge">{badge}</span>
            <button
              aria-label="Close map management details"
              className="map-management-figma-close"
              onClick={closeManagementOverlay}
              type="button"
            >
              <MapCloseIcon />
            </button>
          </div>
        </div>

        {saveError ? (
          <InlineStatusBanner
            heading="Action failed"
            message={saveError}
            tone="error"
          />
        ) : null}
        {saveSuccess ? (
          <InlineStatusBanner
            heading="Changes applied"
            message={saveSuccess}
            tone="neutral"
          />
        ) : null}

        {children}
      </div>
    </article>
  );
}

function CardActionStrip({ children }: { children: ReactNode }) {
  return <div className="map-card-action-strip">{children}</div>;
}

function CardActionButton({
  children,
  className = '',
  tone = 'secondary',
  ...props
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: 'primary' | 'secondary' | 'danger';
  type?: 'button';
}) {
  const toneClassName = tone === 'primary'
    ? 'primary-sidebar-button contemporary-cta map-card-action-button'
    : tone === 'danger'
      ? 'map-card-action-button map-card-danger-action'
      : 'map-card-action-button map-card-secondary-action';

  return (
    <button
      className={`${toneClassName}${className ? ` ${className}` : ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

function AreaList({
  activeAreaId,
  hoveredAreaId,
  onAreaHoverChange,
  onOpenAreaEditor,
  zoneAreas,
}: {
  activeAreaId: string | null;
  hoveredAreaId: string | null;
  onAreaHoverChange: (areaId: string | null) => void;
  onOpenAreaEditor: (areaId: string, areaName: string) => void;
  zoneAreas: MapManagementAreaFixture[];
}) {
  if (zoneAreas.length === 0) {
    return (
      <div className="map-management-figma-empty-state">
        No areas exist in this zone yet.
      </div>
    );
  }

  return (
    <div className="map-management-figma-area-list" role="list">
      {zoneAreas.map((area) => {
        const isActive = area.areaId === activeAreaId;
        const isHovered = area.areaId === hoveredAreaId;

        return (
          <button
            className={`map-management-figma-area-row${isActive ? ' is-active' : ''}${isHovered ? ' is-hovered' : ''}`}
            key={area.areaId}
            onClick={() => onOpenAreaEditor(area.areaId, area.areaName)}
            onMouseEnter={() => onAreaHoverChange(area.areaId)}
            onMouseLeave={() => onAreaHoverChange(null)}
            type="button"
          >
            <div className="map-management-figma-area-row-copy">
              <strong>{area.areaName}</strong>
              <span>{area.currentTreeCountValue} trees</span>
            </div>
            <div className="map-management-figma-area-row-meta">
              <span>{area.currentDensityPer100Sqm ?? 'Unavailable'} / 100m²</span>
              <em>{area.assignedPlanterValue}</em>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function MapManagementOverlayCard({
  activeSelection,
  areaDetail,
  areaDefinitionStatus,
  areaNameInput,
  boundaryCoordinates,
  closeManagementOverlay,
  densityInput,
  editableAreaName,
  hasAnyDraftChanges,
  hasEditableArea,
  hoveredAreaId,
  isCreatingArea,
  isDeletingArea,
  isGeometryDrawing,
  isGeometryEditing,
  isSaving,
  notesValue,
  onAreaHoverChange,
  onAreaNameInputChange,
  onCreateArea,
  onDeleteArea,
  onDensityInputChange,
  onFinishGeometryDraw,
  onOpenAreaEditor,
  onOpenCreateAreaCard,
  onOpenEditAreasCard,
  onOpenZoneInfoCard,
  onResetGeometryEdit,
  onSave,
  onStartGeometryEdit,
  onTreeCountInputChange,
  overlayMode,
  saveError,
  saveSuccess,
  treeCountInput,
  zoneAreas,
  zoneDetail,
  zoneKey,
  zoneName,
}: MapManagementOverlayCardProps) {
  if (!zoneDetail || !activeSelection) {
    return null;
  }

  const activeAreaId = activeSelection.kind === 'area' ? activeSelection.areaId : null;

  if (overlayMode === 'edit-areas') {
    return (
      <OverlayShell
        badge="Zone Areas"
        closeManagementOverlay={closeManagementOverlay}
        heading={`${zoneName} Areas`}
        saveError={saveError}
        saveSuccess={saveSuccess}
        subheading="Edit Areas"
      >
        <div className="map-management-figma-copy-block">
          <p>Select an area from the list to edit or delete it. Hover a row to highlight the respective area on the map.</p>
        </div>

        <CardActionStrip>
          <CardActionButton onClick={onOpenZoneInfoCard} type="button">
            Back to Zone Info
          </CardActionButton>
        </CardActionStrip>

        <AreaList
          activeAreaId={activeAreaId}
          hoveredAreaId={hoveredAreaId}
          onAreaHoverChange={onAreaHoverChange}
          onOpenAreaEditor={onOpenAreaEditor}
          zoneAreas={zoneAreas}
        />
      </OverlayShell>
    );
  }

  if (overlayMode === 'create-area') {
    return (
      <OverlayShell
        badge="New Area"
        closeManagementOverlay={closeManagementOverlay}
        heading={`Create Area in ${zoneName}`}
        saveError={saveError}
        saveSuccess={saveSuccess}
        subheading="Create Area"
      >
        <div className="map-management-figma-copy-block">
          <p>{notesValue}</p>
        </div>

        <CardActionStrip>
          <CardActionButton
            disabled={isSaving || isCreatingArea}
            onClick={isGeometryEditing ? onResetGeometryEdit : onStartGeometryEdit}
            type="button"
          >
            <MapGeometryEditIcon />
            <span>
              {isGeometryEditing
                ? (isGeometryDrawing || boundaryCoordinates.length > 0 ? 'Restart Drawing' : 'Drawing Enabled')
                : 'Draw Area on Map'}
            </span>
          </CardActionButton>
          {isGeometryDrawing ? (
            <CardActionButton
              disabled={isSaving || isCreatingArea}
              onClick={onFinishGeometryDraw}
              tone="primary"
              type="button"
            >
              <MapSaveIcon />
              <span>Finish Drawing</span>
            </CardActionButton>
          ) : null}
          <CardActionButton
            disabled={isSaving || isCreatingArea || !boundaryCoordinates.length || !areaNameInput.trim() || isGeometryDrawing}
            onClick={onCreateArea}
            tone="primary"
            type="button"
          >
            <MapSaveIcon />
            <span>{isCreatingArea ? 'Creating...' : 'Create Area'}</span>
          </CardActionButton>
          <CardActionButton
            disabled={isSaving || isCreatingArea}
            onClick={onOpenZoneInfoCard}
            type="button"
          >
            Back to Zone Info
          </CardActionButton>
        </CardActionStrip>

        <div className="map-management-figma-form">
          <label className="map-management-figma-field">
            <span>Zone Name</span>
            <div className="map-management-figma-input">{zoneName}</div>
          </label>

          <label className="map-management-figma-field">
            <span>Area Name</span>
            <input
              className="map-management-figma-input map-management-figma-input-control"
              onChange={(event) => onAreaNameInputChange(event.target.value)}
              type="text"
              value={areaNameInput}
            />
          </label>

          <label className="map-management-figma-field">
            <span>Area Definition Status</span>
            <div className="map-management-figma-input">{areaDefinitionStatus}</div>
          </label>

          <label className="map-management-figma-field">
            <span>Boundary Coordinates (WGS84)</span>
            <div className="map-management-figma-coordinates">
              {boundaryCoordinates.length > 0 ? boundaryCoordinates.map((coordinate, index) => (
                <div className="map-management-figma-coordinate-row" key={`${zoneKey}-draft-${index}`}>
                  <code>{coordinate}</code>
                  <MapVerifiedIcon />
                </div>
              )) : (
                <div className="map-management-figma-empty-state">
                  Draw the new area on the map to generate a boundary draft.
                </div>
              )}
            </div>
          </label>
        </div>
      </OverlayShell>
    );
  }

  if (overlayMode === 'area-edit') {
    const detailTreeCountLabel = areaDetail?.currentTreeCountLabel ?? zoneDetail.currentTreeCountLabel;
    const detailAssignedPlanterLabel = areaDetail?.assignedPlanterLabel ?? zoneDetail.assignedPlanterLabel;
    const detailAssignedPlanterValue = areaDetail?.assignedPlanterValue ?? zoneDetail.assignedPlanterValue;

    return (
      <OverlayShell
        badge="Area Editor"
        closeManagementOverlay={closeManagementOverlay}
        heading={editableAreaName}
        saveError={saveError}
        saveSuccess={saveSuccess}
        subheading="Edit Area"
      >
        <CardActionStrip>
          <CardActionButton
            disabled={isSaving || isDeletingArea}
            onClick={onOpenEditAreasCard}
            type="button"
          >
            Back to Areas
          </CardActionButton>
          <CardActionButton
            disabled={isSaving || isDeletingArea || isGeometryEditing}
            onClick={onStartGeometryEdit}
            type="button"
          >
            <MapGeometryEditIcon />
            <span>Edit Area Boundary</span>
          </CardActionButton>
          <CardActionButton
            disabled={isSaving || isDeletingArea || !hasEditableArea || !hasAnyDraftChanges}
            onClick={onSave}
            tone="primary"
            type="button"
          >
            <MapSaveIcon />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </CardActionButton>
          <CardActionButton
            disabled={isSaving || isDeletingArea || isGeometryEditing}
            onClick={onDeleteArea}
            tone="danger"
            type="button"
          >
            {isDeletingArea ? 'Deleting...' : 'Delete Area'}
          </CardActionButton>
        </CardActionStrip>

        <div className="map-management-figma-form">
          <label className="map-management-figma-field">
            <span>Area Name</span>
            <input
              className="map-management-figma-input map-management-figma-input-control"
              onChange={(event) => onAreaNameInputChange(event.target.value)}
              type="text"
              value={areaNameInput}
            />
          </label>

          <label className="map-management-figma-field">
            <span>Area Density (/100m²)</span>
            <input
              className="map-management-figma-input map-management-figma-input-control"
              inputMode="decimal"
              min="0.01"
              onChange={(event) => onDensityInputChange(event.target.value)}
              step="0.1"
              type="number"
              value={densityInput}
            />
          </label>

          <label className="map-management-figma-field">
            <span>{detailTreeCountLabel}</span>
            <input
              className="map-management-figma-input map-management-figma-input-control"
              inputMode="numeric"
              min="0"
              onChange={(event) => onTreeCountInputChange(event.target.value)}
              step="1"
              type="number"
              value={treeCountInput}
            />
          </label>

          <label className="map-management-figma-field">
            <span>{detailAssignedPlanterLabel}</span>
            <div className="map-management-figma-input">{detailAssignedPlanterValue}</div>
          </label>

          <label className="map-management-figma-field">
            <span>Zone Name</span>
            <div className="map-management-figma-input">{zoneName}</div>
          </label>

          <label className="map-management-figma-field">
            <span>Area Definition Status</span>
            <div className="map-management-figma-input">{areaDefinitionStatus}</div>
          </label>

          <label className="map-management-figma-field">
            <span>Boundary Coordinates (WGS84)</span>
            <div className="map-management-figma-coordinates">
              {boundaryCoordinates.map((coordinate, index) => (
                <div className="map-management-figma-coordinate-row" key={`${zoneKey}-area-${index}`}>
                  <code>{coordinate}</code>
                  <MapVerifiedIcon />
                </div>
              ))}
            </div>
          </label>

          <label className="map-management-figma-field">
            <span>Additional Info</span>
            <div className="map-management-figma-textarea">{notesValue}</div>
          </label>
        </div>
      </OverlayShell>
    );
  }

  return (
    <OverlayShell
      badge="Zone Selected"
      closeManagementOverlay={closeManagementOverlay}
      heading={zoneName}
      saveError={saveError}
      saveSuccess={saveSuccess}
      subheading="Zone Info"
    >
      <CardActionStrip>
        <CardActionButton
          disabled={isSaving || isGeometryEditing}
          onClick={onOpenCreateAreaCard}
          tone="primary"
          type="button"
        >
          <MapTaskCreateIcon />
          <span>Add Area</span>
        </CardActionButton>
        <CardActionButton
          disabled={isSaving || isGeometryEditing}
          onClick={onOpenEditAreasCard}
          type="button"
        >
          Edit Areas
        </CardActionButton>
        <CardActionButton
          disabled={isSaving || isGeometryEditing}
          onClick={onStartGeometryEdit}
          type="button"
        >
          <MapGeometryEditIcon />
          <span>Edit Zone Boundary</span>
        </CardActionButton>
        {isGeometryEditing || hasAnyDraftChanges ? (
          <CardActionButton
            disabled={isSaving || !hasAnyDraftChanges}
            onClick={onSave}
            tone="primary"
            type="button"
          >
            <MapSaveIcon />
            <span>{isSaving ? 'Saving...' : 'Save Zone Changes'}</span>
          </CardActionButton>
        ) : null}
      </CardActionStrip>

      <div className="map-management-figma-density-summary">
        <div className="map-management-figma-density-card is-primary">
          <span>{zoneDetail.prominentDensityLabel}</span>
          <strong>{zoneDetail.prominentDensityValue}</strong>
        </div>
        <div className="map-management-figma-density-card">
          <span>{zoneDetail.contractFulfillmentLabel}</span>
          <strong>{zoneDetail.contractFulfillmentValue}</strong>
        </div>
      </div>

      <div className="map-management-figma-form">
        <label className="map-management-figma-field">
          <span>Zone Name</span>
          <div className="map-management-figma-input">{zoneName}</div>
        </label>

        <label className="map-management-figma-field">
          <span>{zoneDetail.areaCountLabel}</span>
          <div className="map-management-figma-input">{zoneDetail.areaCount}</div>
        </label>

        <label className="map-management-figma-field">
          <span>{zoneDetail.currentTreeCountLabel}</span>
          <div className="map-management-figma-input">{zoneDetail.currentTreeCountValue}</div>
        </label>

        <label className="map-management-figma-field">
          <span>Area Definition Status</span>
          <div className="map-management-figma-input">{areaDefinitionStatus}</div>
        </label>

        <label className="map-management-figma-field">
          <span>Boundary Coordinates (WGS84)</span>
          <div className="map-management-figma-coordinates">
            {boundaryCoordinates.map((coordinate, index) => (
              <div className="map-management-figma-coordinate-row" key={`${zoneKey}-${index}`}>
                <code>{coordinate}</code>
                <MapVerifiedIcon />
              </div>
            ))}
          </div>
        </label>

        <label className="map-management-figma-field">
          <span>Additional Info</span>
          <div className="map-management-figma-textarea">{notesValue}</div>
        </label>
      </div>
    </OverlayShell>
  );
}
