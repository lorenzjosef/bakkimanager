import { PageStatePanel } from '@bakki/ui';
import {
  MapManagementCanvasChrome,
  MapManagementOverlayCard,
} from './map-management.sections';
import { useMapManagementPageState } from './map-management.page-state';

export function MapManagementPage() {
  const {
    activeSelection,
    areaDetail,
    areaDefinitionStatus,
    areaNameInput,
    boundaryCoordinates,
    closeManagementOverlay,
    densityInput,
    editableAreaName,
    handleCreateArea,
    handleDeleteArea,
    handleFinishGeometryDraw,
    handleBoundaryResetToolClick,
    handleBoundaryStopToolClick,
    handleBoundaryToolClick,
    handleMapControl,
    handleOpenAreaEditor,
    handleOpenCreateAreaCard,
    handleOpenEditAreasCard,
    handleOpenZoneInfoCard,
    handleSave,
    hasAnyDraftChanges,
    hasEditableArea,
    hasGeometryDraftChanges,
    hoveredAreaId,
    isAreaSelection,
    isCreatingArea,
    isDeletingArea,
    isGeometryDrawing,
    isGeometryEditing,
    isOverlayVisible,
    isRuntimeReady,
    isSaving,
    mapManagement,
    notesValue,
    overlayMode,
    ref,
    refetch,
    renderState,
    saveError,
    saveSuccess,
    selectedLayerLabel,
    selectionMode,
    setAreaNameInput,
    setDensityInput,
    setHoveredAreaId,
    setSelectionMode,
    setShowAreaLayer,
    setShowLayerLegend,
    setShowRanchLayer,
    setShowZoneLayer,
    setTreeCountInput,
    showAreaLayer,
    showLayerLegend,
    showRanchLayer,
    showZoneLayer,
    treeCountInput,
    zoneAreas,
    zoneDetail,
    zoneKey,
    zoneName,
  } = useMapManagementPageState();

  if (renderState === 'loading') {
    return (
      <section className="view is-active" id="view-map-management" ref={ref}>
        <div className="page-content map-management-figma-page" data-node-id="60:4046">
          <PageStatePanel
            eyebrow="Map Management"
            heading="Loading map management"
            message="Loading editable zone geometry, coordinates, and management metadata."
          />
        </div>
      </section>
    );
  }

  if (renderState === 'unavailable') {
    return (
      <section className="view is-active" id="view-map-management" ref={ref}>
        <div className="page-content map-management-figma-page" data-node-id="60:4046">
          <PageStatePanel
            action={{ label: 'Retry', onAction: () => void refetch() }}
            eyebrow="Map Management"
            heading="Map management unavailable"
            message="The map management data could not be loaded."
            tone="error"
          />
        </div>
      </section>
    );
  }

  if (!mapManagement) {
    return null;
  }

  return (
    <section className="view is-active" id="view-map-management" ref={ref}>
      <div className="page-content map-management-figma-page" data-node-id="60:4046">
        <div className="map-management-figma-main map-focus-card" data-node-id="60:4071">
          <section className="map-management-figma-canvas contemporary-map-canvas map-focus-canvas">
            <div className="map-management-figma-map-image">
              <div className="map-management-live-map" id="map-management-live-map" aria-label="Interactive map management workspace" />
              {!isRuntimeReady ? (
                <div aria-live="polite" className="map-runtime-loading map-runtime-loading-management" role="status">
                  <div className="map-runtime-loading-card">
                    <span className="map-runtime-loading-eyebrow">Interactive Map</span>
                    <strong>Preparing management workspace</strong>
                    <span>Loading editing layers and map controls.</span>
                  </div>
                </div>
              ) : null}
            </div>

            <MapManagementCanvasChrome
              activeSelection={activeSelection}
              handleBoundaryResetToolClick={handleBoundaryResetToolClick}
              handleBoundaryStopToolClick={handleBoundaryStopToolClick}
              handleBoundaryToolClick={handleBoundaryToolClick}
              handleMapControl={handleMapControl}
              hasGeometryDraftChanges={hasGeometryDraftChanges}
              isAreaSelection={isAreaSelection}
              isGeometryEditing={isGeometryEditing}
              onSelectionModeChange={setSelectionMode}
              selectedLayerLabel={selectedLayerLabel}
              selectionMode={selectionMode}
              showAreaLayer={showAreaLayer}
              showLayerLegend={showLayerLegend}
              showRanchLayer={showRanchLayer}
              showZoneLayer={showZoneLayer}
              toggleAreaLayer={() => setShowAreaLayer((value) => !value)}
              toggleLayerLegend={() => setShowLayerLegend((value) => !value)}
              toggleRanchLayer={() => setShowRanchLayer((value) => !value)}
              toggleZoneLayer={() => setShowZoneLayer((value) => !value)}
            />

            <div className="map-management-figma-overlay" id="map-management-overlay" hidden={!isOverlayVisible}>
              {isOverlayVisible ? (
                <MapManagementOverlayCard
                  activeSelection={activeSelection}
                  areaDetail={areaDetail}
                  areaDefinitionStatus={areaDefinitionStatus}
                  areaNameInput={areaNameInput}
                  boundaryCoordinates={boundaryCoordinates}
                  closeManagementOverlay={closeManagementOverlay}
                  densityInput={densityInput}
                  editableAreaName={editableAreaName}
                  hasAnyDraftChanges={hasAnyDraftChanges}
                  hasEditableArea={hasEditableArea}
                  hoveredAreaId={hoveredAreaId}
                  isCreatingArea={isCreatingArea}
                  isDeletingArea={isDeletingArea}
                  isGeometryDrawing={isGeometryDrawing}
                  isGeometryEditing={isGeometryEditing}
                  isSaving={isSaving}
                  notesValue={notesValue}
                  onAreaHoverChange={setHoveredAreaId}
                  onAreaNameInputChange={setAreaNameInput}
                  onCreateArea={() => void handleCreateArea()}
                  onDeleteArea={() => void handleDeleteArea()}
                  onDensityInputChange={setDensityInput}
                  onFinishGeometryDraw={handleFinishGeometryDraw}
                  onOpenAreaEditor={handleOpenAreaEditor}
                  onOpenCreateAreaCard={handleOpenCreateAreaCard}
                  onOpenEditAreasCard={handleOpenEditAreasCard}
                  onOpenZoneInfoCard={handleOpenZoneInfoCard}
                  onResetGeometryEdit={handleBoundaryResetToolClick}
                  onSave={() => void handleSave()}
                  onStartGeometryEdit={handleBoundaryToolClick}
                  onTreeCountInputChange={setTreeCountInput}
                  overlayMode={overlayMode}
                  saveError={saveError}
                  saveSuccess={saveSuccess}
                  treeCountInput={treeCountInput}
                  zoneAreas={zoneAreas}
                  zoneDetail={zoneDetail ?? null}
                  zoneKey={zoneKey}
                  zoneName={zoneName}
                />
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
