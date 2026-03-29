import type { PlantingPhaseOverviewData } from '@bakki/domain';

export type PlantingPhasesOverviewRenderState = 'loading' | 'unavailable' | 'ready';

export function resolvePlantingPhasesOverviewRenderState(
  phaseOverview: PlantingPhaseOverviewData | null | undefined,
  isPending: boolean,
) {
  if (isPending && !phaseOverview) {
    return 'loading' as const;
  }

  if (!phaseOverview) {
    return 'unavailable' as const;
  }

  return 'ready' as const;
}
