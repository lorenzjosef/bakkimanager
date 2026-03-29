import type {
  BakkiAreaContractRecord,
  BakkiPhaseParticipantRecord,
  BakkiPhaseSummaryRecord,
} from './bakki-phase.service';
import { toIsoDateString } from './query-date.utils';

export { toIsoDateString };

export interface BakkiPhaseSummaryRow {
  area_count: number | string;
  assigned_contract_count?: number | string;
  end_date: Date | string;
  id: number | string;
  participant_count: number | string;
  phase_name: string;
  start_date: Date | string;
  state: 'draft' | 'active' | 'done' | 'cancelled';
}

export interface BakkiPhaseInsertRow {
  end_date: Date | string;
  id: number | string;
  phase_name: string;
  start_date: Date | string;
  state: 'draft' | 'active' | 'done' | 'cancelled';
}

export interface BakkiActivePhaseMetricsRow {
  average_density: number | string | null;
  phase_name: string | null;
  total_contract_goal: number | string | null;
}

export interface BakkiAreaContractRow {
  area_ref: string;
  assigned_user_id: number | string;
  assigned_user_name: string | null;
  contract_tree_goal: number | string | null;
  phase_id: number | string;
  phase_name: string;
  phase_state: 'draft' | 'active' | 'done' | 'cancelled';
  species_ref: string | null;
  species_name: string | null;
  tray_count: number | string | null;
  trees_per_tray: number | string | null;
  target_density_per_100sqm: number | string | null;
}

export interface BakkiAreaContractByPhaseRow extends BakkiAreaContractRow {}

export interface BakkiPhaseParticipantRow {
  bakki_user_id: number | string;
  display_name: string | null;
  phase_id: number | string;
  role: string | null;
}

export function mapPhaseSummaryRow(row: BakkiPhaseSummaryRow): BakkiPhaseSummaryRecord {
  const areaCount = Number(row.area_count ?? 0);
  const assignedContractCount = Number(row.assigned_contract_count ?? row.area_count ?? 0);
  const participantCount = Number(row.participant_count ?? 0);

  return {
    createdPhaseId: `phase-${Number(row.id)}`,
    phaseName: row.phase_name,
    startDate: toIsoDateString(row.start_date),
    endDate: toIsoDateString(row.end_date),
    state: row.state,
    participantCount,
    areaCount,
    assignedContractCount,
  };
}

export function mapAreaContractRow(row: BakkiAreaContractRow): BakkiAreaContractRecord {
  return {
    areaRef: row.area_ref,
    assignedUserId: Number(row.assigned_user_id),
    assignedUserName: row.assigned_user_name,
    contractTreeGoal:
      row.contract_tree_goal === null ? null : Number(row.contract_tree_goal),
    speciesName: row.species_name,
    speciesRef: row.species_ref,
    trayCount: row.tray_count === null ? null : Number(row.tray_count),
    treesPerTray: row.trees_per_tray === null ? null : Number(row.trees_per_tray),
    targetDensityPer100Sqm:
      row.target_density_per_100sqm === null ? null : Number(row.target_density_per_100sqm),
    phaseId: Number(row.phase_id),
    phaseName: row.phase_name,
    phaseState: row.phase_state,
  };
}

export function groupAreaContractRowsByPhaseId(rows: BakkiAreaContractByPhaseRow[]) {
  const byPhaseId = new Map<number, BakkiAreaContractRecord[]>();
  for (const row of rows) {
    const record = mapAreaContractRow(row);
    const entries = byPhaseId.get(record.phaseId) ?? [];
    entries.push(record);
    byPhaseId.set(record.phaseId, entries);
  }

  return byPhaseId;
}

export function groupParticipantRowsByPhaseId(rows: BakkiPhaseParticipantRow[]) {
  const byPhaseId = new Map<number, BakkiPhaseParticipantRecord[]>();
  for (const row of rows) {
    const phaseId = Number(row.phase_id);
    const entries = byPhaseId.get(phaseId) ?? [];
    entries.push({
      phaseId,
      role: row.role,
      userId: Number(row.bakki_user_id),
      userName: row.display_name,
    });
    byPhaseId.set(phaseId, entries);
  }

  return byPhaseId;
}
