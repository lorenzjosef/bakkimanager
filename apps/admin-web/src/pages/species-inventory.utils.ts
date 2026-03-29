import type {
  AdjustSpeciesInventoryRequest,
  CreateSpeciesRequest,
  InventoryAdjustmentReason,
  SpeciesInventoryDetail,
  SpeciesInventoryData,
  SpeciesRecord,
  UpdateSpeciesRequest,
} from '@bakki/domain';

export interface SpeciesCreateDraft {
  areaType: string;
  botanicalName: string;
  code: string;
  commonName: string;
  growthPhase: string;
  initialQuantity: string;
  inventoryUnit: string;
  notes: string;
  treesPerTray: string;
}

export interface SpeciesUpdateDraft {
  areaType: string;
  botanicalName: string;
  commonName: string;
  growthPhase: string;
  inventoryUnit: string;
  notes: string;
  treesPerTray: string;
}

export type SpeciesInventoryRenderState = 'loading' | 'unavailable' | 'ready';

export interface SpeciesInventoryAdjustmentDraft {
  note: string;
  reason: InventoryAdjustmentReason;
  targetStock: string;
  trayCount: string;
  trayMultiple: string;
}

export type SpeciesInventoryAdjustmentMode = 'add' | 'update';

export function buildEmptySpeciesInventoryAdjustmentDraft(): SpeciesInventoryAdjustmentDraft {
  return {
    note: '',
    reason: 'adjustment',
    targetStock: '',
    trayCount: '',
    trayMultiple: '',
  };
}

export function buildEmptySpeciesCreateDraft(): SpeciesCreateDraft {
  return {
    areaType: '',
    botanicalName: '',
    code: '',
    commonName: '',
    growthPhase: '',
    initialQuantity: '0',
    inventoryUnit: 'trees',
    notes: '',
    treesPerTray: '',
  };
}

export function buildEmptySpeciesUpdateDraft(): SpeciesUpdateDraft {
  return {
    areaType: '',
    botanicalName: '',
    commonName: '',
    growthPhase: '',
    inventoryUnit: 'trees',
    notes: '',
    treesPerTray: '',
  };
}

export function buildSpeciesUpdateDraft(
  species: SpeciesRecord,
  speciesDetail?: SpeciesInventoryDetail | null,
): SpeciesUpdateDraft {
  return {
    areaType: species.areaType,
    botanicalName: species.botanicalName,
    commonName: species.commonName,
    growthPhase: species.growthPhase,
    inventoryUnit: speciesDetail?.inventoryUnit || 'trees',
    notes: speciesDetail?.notes || '',
    treesPerTray: speciesDetail?.treesPerTray?.toString() || '',
  };
}

export function resolveSpeciesInventoryRenderState(
  data: SpeciesInventoryData | null | undefined,
  isPending: boolean,
) {
  if (isPending && !data) {
    return 'loading' as const;
  }

  if (!data) {
    return 'unavailable' as const;
  }

  return 'ready' as const;
}

export function calculateProjectedInventory(
  currentInventoryUnits: string,
  quantityDelta: number | string | null,
) {
  const currentStock = parseDisplayInteger(currentInventoryUnits);
  if (quantityDelta === null) {
    return currentStock;
  }

  const delta = Number(quantityDelta);

  if (!Number.isFinite(delta)) {
    return currentStock;
  }

  return currentStock + delta;
}

export function calculateTrayQuantityDelta(trayCount: string, trayMultiple: string) {
  const trayUnits = Number(trayCount);
  const multiple = Number(trayMultiple);

  if (!Number.isFinite(trayUnits) || !Number.isFinite(multiple) || trayUnits <= 0 || multiple <= 0) {
    return null;
  }

  return trayUnits * multiple;
}

export function calculateQuantityDeltaFromTarget(
  currentInventoryUnits: string,
  targetStock: string,
) {
  if (!targetStock.trim().length) {
    return null;
  }

  const target = Number(targetStock);
  if (!Number.isFinite(target) || target < 0) {
    return null;
  }

  return target - parseDisplayInteger(currentInventoryUnits);
}

export function resolveInventoryAdjustmentQuantityDelta({
  currentInventoryUnits,
  mode,
  targetStock,
  trayCount,
  trayMultiple,
}: {
  currentInventoryUnits: string;
  mode: SpeciesInventoryAdjustmentMode | null;
  targetStock: string;
  trayCount: string;
  trayMultiple: string;
}) {
  if (mode === 'add') {
    return calculateTrayQuantityDelta(trayCount, trayMultiple);
  }

  if (mode === 'update') {
    return calculateQuantityDeltaFromTarget(currentInventoryUnits, targetStock);
  }

  return null;
}

export function canSubmitInventoryAdjustment(
  quantityDelta: number | string | null,
  projectedInventoryUnits: number | null,
  isPending: boolean,
) {
  if (quantityDelta === null) {
    return false;
  }

  return (
    Number.isFinite(Number(quantityDelta))
    && Number(quantityDelta) !== 0
    && (projectedInventoryUnits === null || projectedInventoryUnits >= 0)
    && !isPending
  );
}

export function buildAdjustSpeciesInventoryPayload(
  quantityDelta: number | string,
  reason: InventoryAdjustmentReason,
  note: string,
): AdjustSpeciesInventoryRequest {
  return {
    quantityDelta: Number(quantityDelta),
    reason,
    note: note.trim() || undefined,
  };
}

export function canSubmitCreateSpecies(
  commonName: string,
  botanicalName: string,
  initialQuantity: string,
  inventoryUnit: string,
  treesPerTray: string,
  isPending: boolean,
) {
  return (
    commonName.trim().length > 0
    && botanicalName.trim().length > 0
    && Number.isFinite(Number(initialQuantity))
    && Number(initialQuantity) >= 0
    && inventoryUnit.trim().length > 0
    && Number.isFinite(Number(treesPerTray))
    && Number(treesPerTray) > 0
    && !isPending
  );
}

export function buildCreateSpeciesPayload(draft: SpeciesCreateDraft): CreateSpeciesRequest {
  return {
    commonName: draft.commonName,
    botanicalName: draft.botanicalName,
    code: draft.code.trim() || undefined,
    inventoryUnit: draft.inventoryUnit.trim() || undefined,
    initialQuantityOnHand: Number(draft.initialQuantity),
    growthPhaseLabel: draft.growthPhase.trim() || undefined,
    areaTypeLabel: draft.areaType.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    treesPerTray: Number(draft.treesPerTray),
  };
}

export function canSubmitUpdateSpecies(
  commonName: string,
  botanicalName: string,
  inventoryUnit: string,
  treesPerTray: string,
  isPending: boolean,
) {
  return (
    commonName.trim().length > 0
    && botanicalName.trim().length > 0
    && inventoryUnit.trim().length > 0
    && Number.isFinite(Number(treesPerTray))
    && Number(treesPerTray) > 0
    && !isPending
  );
}

export function buildUpdateSpeciesPayload(draft: SpeciesUpdateDraft): UpdateSpeciesRequest {
  return {
    commonName: draft.commonName,
    botanicalName: draft.botanicalName,
    inventoryUnit: draft.inventoryUnit.trim() || undefined,
    growthPhaseLabel: draft.growthPhase.trim() || undefined,
    areaTypeLabel: draft.areaType.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    treesPerTray: Number(draft.treesPerTray),
  };
}

function parseDisplayInteger(value: string) {
  const normalized = value.replace(/[^0-9-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
