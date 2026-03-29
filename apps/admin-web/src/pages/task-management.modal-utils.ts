import type { RecordMonitoringResultRequest } from '@bakki/domain';

export function canSubmitMonitoringResult(densityPer100Sqm: string, isPending: boolean) {
  const normalizedDensity = Number(densityPer100Sqm.trim());
  return Number.isFinite(normalizedDensity) && normalizedDensity > 0 && !isPending;
}

export function buildMonitoringResultPayload(
  densityPer100Sqm: string,
  treeCount: string,
  observedAt: string,
  notes: string,
): RecordMonitoringResultRequest {
  return {
    densityPer100Sqm: Number(densityPer100Sqm.trim()),
    ...(treeCount.trim() ? { treeCount: Number(treeCount.trim()) } : {}),
    ...(observedAt ? { observedAt } : {}),
    ...(notes.trim() ? { notes: notes.trim() } : {}),
  };
}

export function buildMonitoringSuccessMessage(titleLabel: string, densityPer100Sqm: number) {
  return `Density updated to ${Math.round(densityPer100Sqm)} / 100m² for ${titleLabel}.`;
}
