import { useEffect, useMemo, useState } from 'react';
import type {
  AdjustSpeciesInventoryResponse,
  CreateSpeciesResponse,
  SpeciesRecord,
  UpdateSpeciesResponse,
} from '@bakki/domain';
import {
  useAdjustSpeciesInventoryMutation,
  useCreateSpeciesMutation,
  useSpeciesDetailData,
  useSpeciesInventoryData,
  useUpdateSpeciesMutation,
} from '@/queries/species';
import { useUIStore } from '@/store/ui';
import {
  buildAdjustSpeciesInventoryPayload,
  buildCreateSpeciesPayload,
  buildEmptySpeciesCreateDraft,
  buildEmptySpeciesInventoryAdjustmentDraft,
  buildEmptySpeciesUpdateDraft,
  buildSpeciesUpdateDraft,
  buildUpdateSpeciesPayload,
  calculateProjectedInventory,
  resolveInventoryAdjustmentQuantityDelta,
  resolveSpeciesInventoryRenderState,
  type SpeciesInventoryAdjustmentMode,
} from './species-inventory.utils';

export function useSpeciesInventoryPageState() {
  const inventoryQuery = useSpeciesInventoryData();
  const speciesDetailOpen = useUIStore((state) => state.speciesDetailOpen);
  const selectedSpeciesId = useUIStore((state) => state.selectedSpeciesId);
  const openSpeciesDetail = useUIStore((state) => state.openSpeciesDetail);
  const closeSpeciesDetail = useUIStore((state) => state.closeSpeciesDetail);
  const setSelectedSpeciesId = useUIStore((state) => state.setSelectedSpeciesId);
  const adjustInventoryMutation = useAdjustSpeciesInventoryMutation();
  const createSpeciesMutation = useCreateSpeciesMutation();
  const updateSpeciesMutation = useUpdateSpeciesMutation();
  const [inventoryAdjustmentMode, setInventoryAdjustmentMode] = useState<SpeciesInventoryAdjustmentMode | null>(null);
  const [createSpeciesModalOpen, setCreateSpeciesModalOpen] = useState(false);
  const [editSpeciesModalOpen, setEditSpeciesModalOpen] = useState(false);
  const [adjustmentDraft, setAdjustmentDraft] = useState(() => buildEmptySpeciesInventoryAdjustmentDraft());
  const [createDraft, setCreateDraft] = useState(() => buildEmptySpeciesCreateDraft());
  const [editDraft, setEditDraft] = useState(() => buildEmptySpeciesUpdateDraft());
  const [lastAdjustment, setLastAdjustment] = useState<AdjustSpeciesInventoryResponse | null>(null);
  const [lastCreatedSpecies, setLastCreatedSpecies] = useState<CreateSpeciesResponse | null>(null);
  const [lastUpdatedSpecies, setLastUpdatedSpecies] = useState<UpdateSpeciesResponse | null>(null);
  const selectedSpecies = useMemo(
    () => inventoryQuery.data?.rows.find((row) => row.id === selectedSpeciesId) ?? inventoryQuery.data?.rows[0] ?? null,
    [inventoryQuery.data, selectedSpeciesId],
  );
  const speciesDetailQuery = useSpeciesDetailData(
    speciesDetailOpen ? selectedSpecies?.id ?? null : null,
  );
  const inventoryModalOpen = inventoryAdjustmentMode !== null;
  const resolvedAdjustmentQuantityDelta = useMemo(() => {
    if (!selectedSpecies) {
      return null;
    }

    return resolveInventoryAdjustmentQuantityDelta({
      currentInventoryUnits: selectedSpecies.inventoryUnits,
      mode: inventoryAdjustmentMode,
      targetStock: adjustmentDraft.targetStock,
      trayCount: adjustmentDraft.trayCount,
      trayMultiple: adjustmentDraft.trayMultiple,
    });
  }, [
    adjustmentDraft.targetStock,
    adjustmentDraft.trayCount,
    adjustmentDraft.trayMultiple,
    inventoryAdjustmentMode,
    selectedSpecies,
  ]);
  const projectedStock = useMemo(() => {
    if (!selectedSpecies) {
      return null;
    }

    return calculateProjectedInventory(
      selectedSpecies.inventoryUnits,
      resolvedAdjustmentQuantityDelta,
    );
  }, [resolvedAdjustmentQuantityDelta, selectedSpecies]);
  const renderState = resolveSpeciesInventoryRenderState(
    inventoryQuery.data,
    inventoryQuery.isPending,
  );

  useEffect(() => {
    if (!inventoryQuery.data?.rows.length) {
      return;
    }

    if (
      !selectedSpeciesId
      || !inventoryQuery.data.rows.some((row) => row.id === selectedSpeciesId)
    ) {
      setSelectedSpeciesId(inventoryQuery.data.rows[0].id);
    }
  }, [inventoryQuery.data, selectedSpeciesId, setSelectedSpeciesId]);

  const resetAdjustmentDraft = () => {
    setAdjustmentDraft(buildEmptySpeciesInventoryAdjustmentDraft());
  };

  const resetCreateDraft = () => {
    setCreateDraft(buildEmptySpeciesCreateDraft());
  };

  const openCreateModal = () => {
    setCreateSpeciesModalOpen(true);
    setLastCreatedSpecies(null);
    setLastUpdatedSpecies(null);
    if (createSpeciesMutation.isError) {
      createSpeciesMutation.reset();
    }
  };

  const closeCreateModal = () => {
    setCreateSpeciesModalOpen(false);
    resetCreateDraft();
    if (createSpeciesMutation.isError) {
      createSpeciesMutation.reset();
    }
  };

  const openInventoryModal = (mode: SpeciesInventoryAdjustmentMode) => {
    setInventoryAdjustmentMode(mode);
    setAdjustmentDraft({
      ...buildEmptySpeciesInventoryAdjustmentDraft(),
      reason: mode === 'add' ? 'adjustment' : 'correction',
    });
    setLastAdjustment(null);
    if (adjustInventoryMutation.isError) {
      adjustInventoryMutation.reset();
    }
  };

  const closeInventoryModal = () => {
    setInventoryAdjustmentMode(null);
    resetAdjustmentDraft();
    if (adjustInventoryMutation.isError) {
      adjustInventoryMutation.reset();
    }
  };

  const openEditModal = () => {
    if (!selectedSpecies) {
      return;
    }

    setEditDraft(buildSpeciesUpdateDraft(selectedSpecies, speciesDetailQuery.data));
    setLastUpdatedSpecies(null);
    if (updateSpeciesMutation.isError) {
      updateSpeciesMutation.reset();
    }
    setEditSpeciesModalOpen(true);
  };

  const closeEditModal = () => {
    setEditSpeciesModalOpen(false);
    if (updateSpeciesMutation.isError) {
      updateSpeciesMutation.reset();
    }
  };

  const updateCreateDraft = <TKey extends keyof typeof createDraft>(
    key: TKey,
    value: (typeof createDraft)[TKey],
  ) => {
    setCreateDraft((current) => ({ ...current, [key]: value }));
  };

  const updateEditDraft = <TKey extends keyof typeof editDraft>(
    key: TKey,
    value: (typeof editDraft)[TKey],
  ) => {
    setEditDraft((current) => ({ ...current, [key]: value }));
  };

  const updateAdjustmentDraft = <TKey extends keyof typeof adjustmentDraft>(
    key: TKey,
    value: (typeof adjustmentDraft)[TKey],
  ) => {
    setAdjustmentDraft((current) => ({ ...current, [key]: value }));
  };

  const submitInventoryAdjustment = async () => {
    if (!selectedSpecies || resolvedAdjustmentQuantityDelta === null) {
      return;
    }

    const result = await adjustInventoryMutation.mutateAsync({
      speciesId: selectedSpecies.id,
      payload: buildAdjustSpeciesInventoryPayload(
        resolvedAdjustmentQuantityDelta,
        adjustmentDraft.reason,
        adjustmentDraft.note,
      ),
    });
    setLastAdjustment(result);
    setInventoryAdjustmentMode(null);
    resetAdjustmentDraft();
  };

  const submitCreateSpecies = async () => {
    const result = await createSpeciesMutation.mutateAsync(
      buildCreateSpeciesPayload(createDraft),
    );

    setLastCreatedSpecies(result);
    setCreateSpeciesModalOpen(false);
    setSelectedSpeciesId(result.createdSpeciesId);
    openSpeciesDetail(result.createdSpeciesId);
    resetCreateDraft();
  };

  const submitSpeciesUpdate = async () => {
    if (!selectedSpecies) {
      return;
    }

    const result = await updateSpeciesMutation.mutateAsync({
      speciesId: selectedSpecies.id,
      payload: buildUpdateSpeciesPayload(editDraft),
    });
    setLastUpdatedSpecies(result);
    setEditSpeciesModalOpen(false);
  };

  const inventoryErrorMessage = adjustInventoryMutation.isError
    ? adjustInventoryMutation.error instanceof Error
      ? adjustInventoryMutation.error.message
      : 'The stock adjustment could not be saved.'
    : null;
  const createErrorMessage = createSpeciesMutation.isError
    ? createSpeciesMutation.error instanceof Error
      ? createSpeciesMutation.error.message
      : 'The species could not be created.'
    : null;
  const updateErrorMessage = updateSpeciesMutation.isError
    ? updateSpeciesMutation.error instanceof Error
      ? updateSpeciesMutation.error.message
      : 'The species could not be updated.'
    : null;

  return {
    adjustmentDraft,
    closeCreateModal,
    closeEditModal,
    closeInventoryModal,
    closeSpeciesDetail,
    createDraft,
    createErrorMessage,
    createSpeciesModalOpen,
    data: inventoryQuery.data,
    editDraft,
    editSpeciesModalOpen,
    errorMessage: inventoryQuery.error instanceof Error
      ? inventoryQuery.error.message
      : 'The species inventory could not be loaded.',
    inventoryErrorMessage,
    inventoryModalOpen,
    inventoryAdjustmentMode,
    isAdjustingInventory: adjustInventoryMutation.isPending,
    isCreatingSpecies: createSpeciesMutation.isPending,
    isSpeciesDetailPending: speciesDetailQuery.isPending,
    isUpdatingSpecies: updateSpeciesMutation.isPending,
    lastAdjustment,
    lastCreatedSpecies,
    lastUpdatedSpecies,
    onOpenAddStockModal: () => openInventoryModal('add'),
    onOpenCreateModal: openCreateModal,
    onOpenDetail: openSpeciesDetail,
    onOpenEditModal: openEditModal,
    onOpenUpdateStockModal: () => openInventoryModal('update'),
    projectedStock,
    resolvedAdjustmentQuantityDelta,
    refetch: inventoryQuery.refetch,
    refetchSpeciesDetail: speciesDetailQuery.refetch,
    renderState,
    selectedSpecies,
    speciesDetail: speciesDetailQuery.data,
    speciesDetailError: speciesDetailQuery.error,
    speciesDetailOpen,
    submitCreateSpecies,
    submitInventoryAdjustment,
    submitSpeciesUpdate,
    updateAdjustmentDraft,
    updateCreateDraft,
    updateEditDraft,
    updateErrorMessage,
  };
}
