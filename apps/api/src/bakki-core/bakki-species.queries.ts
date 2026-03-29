import type {
  SpeciesGrowthTone,
} from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';
import type { BakkiSpeciesRecord } from './bakki-species.service';

export interface SpeciesBootstrapSeed {
  speciesRef: string;
  commonName: string;
  botanicalName: string;
  quantityOnHand: number;
  totalPlanted: number;
  treesPerTray: number;
  growthPhaseLabel: string;
  areaTypeLabel: string;
  notes: string;
}

export const SPECIES_BOOTSTRAP_SEED: SpeciesBootstrapSeed[] = [
  {
    speciesRef: 'downy-birch',
    commonName: 'Downy Birch',
    botanicalName: 'Betula pubescens',
    quantityOnHand: 12450,
    totalPlanted: 45200,
    treesPerTray: 54,
    growthPhaseLabel: 'Sapling',
    areaTypeLabel: 'Basalt Slopes',
    notes:
      'Native broadleaf species used as a baseline inventory reference for mixed Icelandic reforestation sites.',
  },
  {
    speciesRef: 'european-rowan',
    commonName: 'European Rowan',
    botanicalName: 'Sorbus aucuparia',
    quantityOnHand: 8200,
    totalPlanted: 22100,
    treesPerTray: 45,
    growthPhaseLabel: 'Juvenile',
    areaTypeLabel: 'Coastal Fringe',
    notes:
      'Hardy upland species used in exposed restoration corridors where mixed canopy resilience is required.',
  },
  {
    speciesRef: 'sitka-spruce',
    commonName: 'Sitka Spruce',
    botanicalName: 'Picea sitchensis',
    quantityOnHand: 5120,
    totalPlanted: 88400,
    treesPerTray: 67,
    growthPhaseLabel: 'Dormant',
    areaTypeLabel: 'Lowland Plains',
    notes:
      'Conifer stock reserved for broad coverage planting windows where windbreak density is the primary objective.',
  },
  {
    speciesRef: 'tea-leaf-willow',
    commonName: 'Tea-leaf Willow',
    botanicalName: 'Salix phylicifolia',
    quantityOnHand: 3400,
    totalPlanted: 12600,
    treesPerTray: 40,
    growthPhaseLabel: 'Seedling',
    areaTypeLabel: 'Wetlands',
    notes:
      'Wetland-support species assigned to moisture-heavy areas where root stabilization matters more than canopy cover.',
  },
];

export interface BakkiSpeciesRow {
  active: boolean;
  area_type_label: string | null;
  botanical_name: string;
  common_name: string;
  growth_phase_label: string | null;
  inventory_unit: string;
  notes: string | null;
  quantity_on_hand: number;
  species_ref: string;
  trees_per_tray: number | null;
  total_planted: number;
}

export interface BakkiInventoryTransactionRow {
  id: number | string;
  occurred_at: Date | string;
}

export const BAKKI_SPECIES_SELECT_FIELDS = `
  species_ref,
  common_name,
  botanical_name,
  inventory_unit,
  quantity_on_hand,
  total_planted,
  trees_per_tray,
  growth_phase_label,
  area_type_label,
  notes,
  active
`;

export function mapSpeciesRow(row: BakkiSpeciesRow): BakkiSpeciesRecord {
  return {
    speciesRef: row.species_ref,
    commonName: row.common_name,
    botanicalName: row.botanical_name,
    inventoryUnit: row.inventory_unit,
    quantityOnHand: Number(row.quantity_on_hand),
    totalPlanted: Number(row.total_planted),
    treesPerTray: row.trees_per_tray === null ? null : Number(row.trees_per_tray),
    growthPhaseLabel: row.growth_phase_label,
    areaTypeLabel: row.area_type_label,
    notes: row.notes,
    active: row.active,
  };
}

export function resolveSpeciesVisual(speciesRef: string, index: number) {
  const variants = [
    {
      thumbnailUrl: localAssetUrls.speciesDowny,
      thumbnailClassName: 'species-figma-thumb-downy',
    },
    {
      thumbnailUrl: localAssetUrls.speciesRowan,
      thumbnailClassName: 'species-figma-thumb-rowan',
    },
    {
      thumbnailUrl: localAssetUrls.speciesSpruce,
      thumbnailClassName: 'species-figma-thumb-spruce',
    },
    {
      thumbnailUrl: localAssetUrls.speciesWillow,
      thumbnailClassName: 'species-figma-thumb-willow',
    },
  ] as const;
  const hash = [...speciesRef].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return variants[(hash + index) % variants.length];
}

export function resolveGrowthTone(growthPhaseLabel?: string | null): SpeciesGrowthTone {
  const normalized = growthPhaseLabel?.trim().toLowerCase() || '';

  if (normalized.includes('dormant')) {
    return 'slate';
  }

  if (normalized.includes('juvenile')) {
    return 'blue';
  }

  return 'green';
}
