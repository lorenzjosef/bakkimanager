import type { BakkiSessionState, DashboardSummary } from '@bakki/domain';

export type DashboardRenderState = 'loading' | 'unavailable' | 'ready';

export function resolveDashboardRenderState(
  dashboard: DashboardSummary | null | undefined,
  isPending: boolean,
): DashboardRenderState {
  if (isPending && !dashboard) {
    return 'loading';
  }

  if (!dashboard) {
    return 'unavailable';
  }

  return 'ready';
}

export function hasDashboardProgramItems(dashboard: DashboardSummary) {
  return dashboard.programItems.length > 0;
}

export function resolveDashboardGreetingName(
  dashboard: DashboardSummary,
  session: BakkiSessionState | null | undefined,
) {
  const sessionDisplayName = session?.authenticated ? session.user.displayName.trim() : '';
  if (!sessionDisplayName) {
    return dashboard.greetingName;
  }

  const firstName = sessionDisplayName.split(/\s+/)[0];
  return firstName || dashboard.greetingName;
}
