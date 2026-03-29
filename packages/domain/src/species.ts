export type InventoryAdjustmentReason =
  | 'adjustment'
  | 'correction'
  | 'planting'
  | 'monitoring'
  | 'fertilizing';

export type SpeciesGrowthTone = 'green' | 'blue' | 'slate';

export interface SpeciesRecord {
  id: string;
  commonName: string;
  botanicalName: string;
  inventoryUnits: string;
  totalPlanted: string;
  treesPerTray: number | null;
  growthPhase: string;
  growthTone: SpeciesGrowthTone;
  areaType: string;
  thumbnailUrl: string;
  thumbnailClassName: string;
}

export interface SpeciesDetailMetric {
  label: string;
  value: string;
  metaIconUrl: string;
  metaText: string;
}

export interface SpeciesInventoryDetail {
  areaType: string;
  growthPhase: string;
  heroImageUrl: string;
  heroTag: string;
  inventoryUnit: string;
  name: string;
  notes: string;
  botanicalName: string;
  treesPerTray: number | null;
  metrics: SpeciesDetailMetric[];
  actionIconUrl: string;
  actionLabel: string;
}

export interface SpeciesInventoryData {
  rows: SpeciesRecord[];
  syncTitle: string;
  syncCopy: string;
}

export interface AdjustSpeciesInventoryRequest {
  note?: string;
  quantityDelta: number;
  reason: InventoryAdjustmentReason;
}

export interface AdjustSpeciesInventoryResponse {
  occurredAt: string;
  quantityDelta: number;
  quantityOnHand: number;
  reason: InventoryAdjustmentReason;
  speciesId: string;
  speciesName: string;
  totalPlanted: number | null;
  transactionId: string | null;
}

export interface CreateSpeciesRequest {
  areaTypeLabel?: string;
  botanicalName: string;
  code?: string;
  commonName: string;
  growthPhaseLabel?: string;
  initialQuantityOnHand: number;
  inventoryUnit?: string;
  notes?: string;
  treesPerTray?: number;
}

export interface CreateSpeciesResponse {
  createdSpecies: {
    areaType: string;
    botanicalName: string;
    code: string;
    commonName: string;
    growthPhase: string;
    inventoryUnits: string;
    totalPlanted: string;
  };
  createdSpeciesId: string;
}

export interface UpdateSpeciesRequest {
  areaTypeLabel?: string;
  botanicalName: string;
  commonName: string;
  growthPhaseLabel?: string;
  inventoryUnit?: string;
  notes?: string;
  treesPerTray?: number;
}

export interface UpdateSpeciesResponse {
  updatedSpecies: {
    areaType: string;
    botanicalName: string;
    code: string;
    commonName: string;
    growthPhase: string;
    inventoryUnit: string;
    notes: string;
  };
  updatedSpeciesId: string;
}
