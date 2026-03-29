import type { SettingsOdooDiagnostics } from '@bakki/domain';

export function formatOdooBaseUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

export function formatSettingsTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(value)) + ' UTC';
}

export function getFallbackSyncHistory() {
  return [
    {
      id: 'fallback-odoo',
      label: 'Waiting for live diagnostics',
      detail: 'The Odoo settings page will populate once the API health endpoint responds.',
      timeLabel: 'n/a',
      tone: 'neutral' as const,
    },
    {
      id: 'fallback-mirrors',
      label: 'Mirror sync state unavailable',
      detail: 'Sync error counts and retry state are only shown when Bakki Core is connected.',
      timeLabel: 'n/a',
      tone: 'warning' as const,
    },
    {
      id: 'fallback-media',
      label: 'Media provider pending',
      detail: 'Spaces diagnostics will appear here after the backend reports provider status.',
      timeLabel: 'n/a',
      tone: 'neutral' as const,
    },
    {
      id: 'fallback-weather',
      label: 'Weather feed pending',
      detail: 'Open-Meteo diagnostics will appear here after the backend reports provider status.',
      timeLabel: 'n/a',
      tone: 'neutral' as const,
    },
  ];
}

export function mirrorErrorWidth(
  diagnostics:
    | {
        mirrors: {
          tasks: { errorCount: number; total: number };
          users: { errorCount: number; total: number };
        };
      }
    | undefined,
) {
  if (!diagnostics) {
    return 0;
  }

  const total = diagnostics.mirrors.users.total + diagnostics.mirrors.tasks.total;
  const errors = diagnostics.mirrors.users.errorCount + diagnostics.mirrors.tasks.errorCount;
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(6, Math.round((errors / total) * 100)));
}

export function buildOdooTip(
  diagnostics:
    | Pick<SettingsOdooDiagnostics, 'bakkiCore' | 'deploymentBlockers' | 'geometryPersistence' | 'geometrySeed' | 'media' | 'mirrors' | 'odoo'>
    | undefined,
  errorMessage?: string,
) {
  if (errorMessage) {
    return `Diagnostics request failed: ${errorMessage}`;
  }

  if (!diagnostics) {
    return 'Waiting for live Odoo, Bakki Core, and media diagnostics.';
  }

  if (diagnostics.deploymentBlockers.length > 0) {
    return diagnostics.deploymentBlockers[0].detail;
  }

  if (!diagnostics.odoo.reachable) {
    return 'Odoo Online is currently unreachable. Check service credentials and tenant API availability first.';
  }

  if (diagnostics.odoo.credentialSource === 'api_keys_file') {
    return 'Odoo service credentials are still coming from API_Keys.txt fallback. Move them into runtime secrets before treating deployment as ready.';
  }

  if (!diagnostics.bakkiCore.configured || !diagnostics.bakkiCore.ok) {
    return 'Bakki Core is not healthy. Fix the PostgreSQL/PostGIS connection before trusting sync results.';
  }

  if (!diagnostics.geometrySeed.promotable && !diagnostics.geometrySeed.overrideEnabled) {
    return 'The current ranch/zone seed geometry is blocked from promotion. Clean the source geometry or explicitly enable the override only for deliberate local provisional testing.';
  }

  if (!diagnostics.geometrySeed.promotable && diagnostics.geometrySeed.overrideEnabled) {
    return 'The geometry seed override is active. Bakki can use provisional ranch/zone geometry in this environment, but that state is not suitable for normal deployment.';
  }

  if (
    diagnostics.geometryPersistence.ranchCount === 0
    && diagnostics.geometryPersistence.zoneCount === 0
    && diagnostics.geometryPersistence.areaCount === 0
  ) {
    return 'Bakki Core is healthy, but no persisted ranch, zone, or area geometry exists yet. Run bootstrap after fixing the seed or import corrected geometry before treating maps as live.';
  }

  if (
    diagnostics.geometryPersistence.ranchCount === 0
    || diagnostics.geometryPersistence.zoneCount === 0
    || diagnostics.geometryPersistence.areaCount === 0
  ) {
    return 'Bakki Core geometry is only partially persisted. Complete ranch, zone, and area imports before treating maps as live.';
  }

  if (!diagnostics.media.configured) {
    return 'DigitalOcean Spaces is still not configured. Media uploads will remain unavailable until provider secrets are present.';
  }

  const retrying = diagnostics.mirrors.users.retryingCount + diagnostics.mirrors.tasks.retryingCount;
  if (retrying > 0) {
    return `${retrying} mirrored record${retrying === 1 ? ' is' : 's are'} carrying sync retry state. Clear those before promoting deployment.`;
  }

  return 'Odoo Online, Bakki Core, and media configuration are healthy from the backend perspective.';
}

export function getGeometrySeedStatusLabel(
  geometrySeed:
    | Pick<SettingsOdooDiagnostics['geometrySeed'], 'overrideEnabled' | 'promotable'>
    | undefined,
) {
  if (!geometrySeed) {
    return 'Unknown';
  }

  if (geometrySeed.promotable) {
    return 'Promotable';
  }

  if (geometrySeed.overrideEnabled) {
    return 'Override enabled';
  }

  return 'Needs topology cleanup';
}

export function buildGeometrySeedDetail(
  geometrySeed:
    | Pick<
        SettingsOdooDiagnostics['geometrySeed'],
        'containmentFailures' | 'message' | 'overlapPairs' | 'overrideEnabled' | 'promotable'
      >
    | undefined,
) {
  if (!geometrySeed) {
    return 'Checking geometry-seed validation.';
  }

  const failures =
    !geometrySeed.promotable
      ? ` Containment failures: ${geometrySeed.containmentFailures.join(', ') || 'none'}. Overlap pairs: ${
          geometrySeed.overlapPairs.map(([left, right]) => `${left}/${right}`).join(', ') || 'none'
        }.`
      : '';

  const overrideNote =
    !geometrySeed.promotable && geometrySeed.overrideEnabled
      ? ' Override is active for this environment.'
      : '';

  return `${geometrySeed.message}${failures}${overrideNote}`;
}

export function getGeometryPersistenceStatusLabel(
  geometryPersistence:
    | Pick<SettingsOdooDiagnostics['geometryPersistence'], 'areaCount' | 'ranchCount' | 'zoneCount'>
    | undefined,
) {
  if (!geometryPersistence) {
    return 'Unknown';
  }

  if (
    geometryPersistence.ranchCount > 0
    && geometryPersistence.zoneCount > 0
    && geometryPersistence.areaCount > 0
  ) {
    return 'Persisted';
  }

  if (
    geometryPersistence.ranchCount === 0
    && geometryPersistence.zoneCount === 0
    && geometryPersistence.areaCount === 0
  ) {
    return 'Empty';
  }

  return 'Partial';
}

export function buildGeometryPersistenceDetail(
  geometryPersistence:
    | Pick<SettingsOdooDiagnostics['geometryPersistence'], 'areaCount' | 'ranchCount' | 'zoneCount'>
    | undefined,
) {
  if (!geometryPersistence) {
    return 'Checking persisted geometry counts.';
  }

  return `${geometryPersistence.ranchCount} ranch, ${geometryPersistence.zoneCount} zones, and ${geometryPersistence.areaCount} areas are currently persisted in Bakki Core.`;
}
