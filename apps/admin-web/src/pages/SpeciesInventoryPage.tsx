import { InlineStatusBanner, PageStatePanel } from '@bakki/ui';
import { useSpeciesInventoryPageState } from './species-inventory.page-state';
import {
  CreateSpeciesModal,
  EditSpeciesModal,
  SpeciesInventoryAdjustmentModal,
  SpeciesInventoryWorkspace,
} from './species-inventory.sections';

export function SpeciesInventoryPage() {
  const {
    adjustmentDraft,
    closeCreateModal,
    closeEditModal,
    closeInventoryModal,
    closeSpeciesDetail,
    createDraft,
    createErrorMessage,
    createSpeciesModalOpen,
    data,
    editDraft,
    editSpeciesModalOpen,
    errorMessage,
    inventoryErrorMessage,
    inventoryModalOpen,
    inventoryAdjustmentMode,
    isAdjustingInventory,
    isCreatingSpecies,
    isSpeciesDetailPending,
    isUpdatingSpecies,
    lastAdjustment,
    lastCreatedSpecies,
    lastUpdatedSpecies,
    onOpenAddStockModal,
    onOpenCreateModal,
    onOpenDetail,
    onOpenEditModal,
    onOpenUpdateStockModal,
    projectedStock,
    refetch,
    refetchSpeciesDetail,
    resolvedAdjustmentQuantityDelta,
    renderState,
    selectedSpecies,
    speciesDetail,
    speciesDetailError,
    speciesDetailOpen,
    submitCreateSpecies,
    submitInventoryAdjustment,
    submitSpeciesUpdate,
    updateAdjustmentDraft,
    updateCreateDraft,
    updateEditDraft,
    updateErrorMessage,
  } = useSpeciesInventoryPageState();

  if (renderState === 'loading') {
    return (
      <section className="view is-active" id="view-species">
        <div className="page-content species-figma-page" id="species-page">
          <PageStatePanel
            eyebrow="Inventory"
            heading="Loading inventory data"
            message="Loading species stock and detail panels."
          />
        </div>
      </section>
    );
  }

  if (renderState === 'unavailable') {
    return (
      <section className="view is-active" id="view-species">
        <div className="page-content species-figma-page" id="species-page">
          <PageStatePanel
            action={{ label: 'Retry', onAction: () => void refetch() }}
            eyebrow="Inventory"
            heading="Inventory unavailable"
            message={errorMessage}
            tone="error"
          />
        </div>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const pageClassName = [
    'page-content',
    'species-figma-page',
    speciesDetailOpen ? 'species-detail-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className="view is-active" id="view-species">
      <div className={pageClassName} id="species-page">
        {lastAdjustment ? (
          <InlineStatusBanner
            className="bakki-page-inline-state"
            heading="Inventory updated"
            message={`${lastAdjustment.speciesName} stock is now ${Math.round(lastAdjustment.quantityOnHand).toLocaleString('en-US')} ${lastAdjustment.quantityOnHand === 1 ? 'unit' : 'units'}.`}
            tone="neutral"
          />
        ) : null}
        {lastCreatedSpecies ? (
          <InlineStatusBanner
            className="bakki-page-inline-state"
            heading="Species created"
            message={`Created ${lastCreatedSpecies.createdSpecies.commonName}. Opening stock: ${lastCreatedSpecies.createdSpecies.inventoryUnits} units.`}
            tone="neutral"
          />
        ) : null}
        {lastUpdatedSpecies ? (
          <InlineStatusBanner
            className="bakki-page-inline-state"
            heading="Species updated"
            message={`Updated ${lastUpdatedSpecies.updatedSpecies.commonName}. Growth phase is now ${lastUpdatedSpecies.updatedSpecies.growthPhase}.`}
            tone="neutral"
          />
        ) : null}
        <SpeciesInventoryWorkspace
          isSpeciesDetailPending={isSpeciesDetailPending}
          onCloseDetail={closeSpeciesDetail}
          onOpenAddStockModal={onOpenAddStockModal}
          onOpenCreateModal={onOpenCreateModal}
          onOpenDetail={onOpenDetail}
          onOpenEditModal={onOpenEditModal}
          onOpenUpdateStockModal={onOpenUpdateStockModal}
          onRefetchSpeciesDetail={() => void refetchSpeciesDetail()}
          rows={data.rows}
          selectedSpecies={selectedSpecies}
          speciesDetail={speciesDetail}
          speciesDetailError={speciesDetailError}
          speciesDetailOpen={speciesDetailOpen}
        />
      </div>
      {inventoryModalOpen && selectedSpecies ? (
        <SpeciesInventoryAdjustmentModal
          adjustmentMode={inventoryAdjustmentMode ?? 'update'}
          adjustmentNote={adjustmentDraft.note}
          adjustmentReason={adjustmentDraft.reason}
          currentInventoryUnits={selectedSpecies.inventoryUnits}
          errorMessage={inventoryErrorMessage}
          isPending={isAdjustingInventory}
          onChangeNote={(value) => updateAdjustmentDraft('note', value)}
          onChangeReason={(value) => updateAdjustmentDraft('reason', value)}
          onChangeTargetStock={(value) => updateAdjustmentDraft('targetStock', value)}
          onChangeTrayCount={(value) => updateAdjustmentDraft('trayCount', value)}
          onChangeTrayMultiple={(value) => updateAdjustmentDraft('trayMultiple', value)}
          onClose={closeInventoryModal}
          onSubmit={() => void submitInventoryAdjustment()}
          projectedInventoryUnits={projectedStock}
          resolvedQuantityDelta={resolvedAdjustmentQuantityDelta}
          speciesName={selectedSpecies.commonName}
          successMessage={
            lastAdjustment
              ? `Latest adjustment recorded at ${new Date(lastAdjustment.occurredAt).toLocaleString()}`
              : null
          }
          targetStock={adjustmentDraft.targetStock}
          trayCount={adjustmentDraft.trayCount}
          trayMultiple={adjustmentDraft.trayMultiple}
        />
      ) : null}
      {createSpeciesModalOpen ? (
        <CreateSpeciesModal
          areaType={createDraft.areaType}
          botanicalName={createDraft.botanicalName}
          code={createDraft.code}
          commonName={createDraft.commonName}
          errorMessage={createErrorMessage}
          growthPhase={createDraft.growthPhase}
          initialQuantity={createDraft.initialQuantity}
          inventoryUnit={createDraft.inventoryUnit}
          isPending={isCreatingSpecies}
          notes={createDraft.notes}
          treesPerTray={createDraft.treesPerTray}
          onChangeAreaType={(value) => updateCreateDraft('areaType', value)}
          onChangeBotanicalName={(value) => updateCreateDraft('botanicalName', value)}
          onChangeCode={(value) => updateCreateDraft('code', value)}
          onChangeCommonName={(value) => updateCreateDraft('commonName', value)}
          onChangeGrowthPhase={(value) => updateCreateDraft('growthPhase', value)}
          onChangeInitialQuantity={(value) => updateCreateDraft('initialQuantity', value)}
          onChangeInventoryUnit={(value) => updateCreateDraft('inventoryUnit', value)}
          onChangeNotes={(value) => updateCreateDraft('notes', value)}
          onChangeTreesPerTray={(value) => updateCreateDraft('treesPerTray', value)}
          onClose={closeCreateModal}
          onSubmit={() => void submitCreateSpecies()}
        />
      ) : null}
      {editSpeciesModalOpen && selectedSpecies ? (
        <EditSpeciesModal
          areaType={editDraft.areaType}
          botanicalName={editDraft.botanicalName}
          commonName={editDraft.commonName}
          errorMessage={updateErrorMessage}
          growthPhase={editDraft.growthPhase}
          inventoryUnit={editDraft.inventoryUnit}
          isPending={isUpdatingSpecies}
          notes={editDraft.notes}
          treesPerTray={editDraft.treesPerTray}
          onChangeAreaType={(value) => updateEditDraft('areaType', value)}
          onChangeBotanicalName={(value) => updateEditDraft('botanicalName', value)}
          onChangeCommonName={(value) => updateEditDraft('commonName', value)}
          onChangeGrowthPhase={(value) => updateEditDraft('growthPhase', value)}
          onChangeInventoryUnit={(value) => updateEditDraft('inventoryUnit', value)}
          onChangeNotes={(value) => updateEditDraft('notes', value)}
          onChangeTreesPerTray={(value) => updateEditDraft('treesPerTray', value)}
          onClose={closeEditModal}
          onSubmit={() => void submitSpeciesUpdate()}
          speciesCode={selectedSpecies.id}
        />
      ) : null}
    </section>
  );
}
