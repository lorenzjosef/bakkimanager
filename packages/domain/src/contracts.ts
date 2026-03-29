export const GLOBAL_RANCH_CONTRACT_TREE_GOAL = 120000;

export interface ContractAreaContribution {
  areaId: string;
  areaName: string;
  currentTreeCount: number;
}

export interface ZoneContractSummary {
  areaCount: number;
  areas: ContractAreaContribution[];
  fulfillmentPercent: number | null;
  goalTreeCount: number;
  plantedTreeCount: number;
  zoneId: string;
  zoneName: string;
}

export interface ContractsSummary {
  globalFulfillmentPercent: number;
  globalGoalTreeCount: number;
  globalPlantedTreeCount: number;
  zones: ZoneContractSummary[];
}
