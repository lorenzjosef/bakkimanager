import type { SettingsOdooDiagnostics } from '@bakki/domain';

export function emptyMirrorSummary() {
  return {
    total: 0,
    okCount: 0,
    errorCount: 0,
    retryingCount: 0,
    lastAttemptAt: null,
    lastSuccessAt: null,
  };
}

export function buildSyncHistory(input: {
  bakkiCore: SettingsOdooDiagnostics['bakkiCore'];
  checkedAt: string;
  geometryPersistence: SettingsOdooDiagnostics['geometryPersistence'];
  geometrySeed: SettingsOdooDiagnostics['geometrySeed'];
  media: SettingsOdooDiagnostics['media'];
  mirrors: SettingsOdooDiagnostics['mirrors'];
  odoo: SettingsOdooDiagnostics['odoo'];
  weather: SettingsOdooDiagnostics['weather'];
}) {
  const items: SettingsOdooDiagnostics['syncHistory'] = [];

  items.push({
    id: 'odoo-connectivity',
    label: input.odoo.reachable ? 'Odoo API reachable' : 'Odoo API unavailable',
    detail: input.odoo.message,
    timeLabel: formatTimeLabel(input.odoo.checkedAt),
    tone: input.odoo.reachable ? 'success' : 'warning',
  });

  if (input.mirrors.users.errorCount > 0 || input.mirrors.tasks.errorCount > 0) {
    items.push({
      id: 'mirror-sync-errors',
      label: 'Mirror sync issues detected',
      detail: `${input.mirrors.users.errorCount} user mirror errors, ${input.mirrors.tasks.errorCount} task mirror errors`,
      timeLabel: formatTimeLabel(input.mirrors.tasks.lastAttemptAt || input.mirrors.users.lastAttemptAt || input.checkedAt),
      tone: 'warning',
    });
  } else if (!input.bakkiCore.configured || !input.bakkiCore.ok) {
    items.push({
      id: 'mirror-sync-unavailable',
      label: 'Bakki mirrors unavailable',
      detail: !input.bakkiCore.configured
        ? 'Bakki Core is not configured in this environment, so Odoo mirrors are not being persisted locally.'
        : 'Bakki Core is currently unhealthy, so mirror health cannot be read until PostgreSQL/PostGIS connectivity is restored.',
      timeLabel: formatTimeLabel(input.checkedAt),
      tone: 'warning',
    });
  } else {
    items.push({
      id: 'mirror-sync-ok',
      label: 'Bakki mirrors healthy',
      detail: `${input.mirrors.users.okCount} user mirrors and ${input.mirrors.tasks.okCount} task mirrors synced cleanly`,
      timeLabel: formatTimeLabel(input.mirrors.tasks.lastSuccessAt || input.mirrors.users.lastSuccessAt || input.checkedAt),
      tone: 'success',
    });
  }

  items.push({
    id: 'media-provider',
    label: input.media.configured ? 'Media uploads configured' : 'Media uploads not configured',
    detail: input.media.message,
    timeLabel: formatTimeLabel(input.checkedAt),
    tone: input.media.configured ? 'neutral' : 'warning',
  });

  items.push({
    id: 'weather-provider',
    label: input.weather.available ? 'Weather feed reachable' : 'Weather feed unavailable',
    detail: input.weather.message,
    timeLabel: formatTimeLabel(input.weather.checkedAt),
    tone: input.weather.available ? 'neutral' : 'warning',
  });

  items.push({
    id: 'geometry-seed-validation',
    label: input.geometrySeed.promotable ? 'Geometry seed promotable' : 'Geometry seed requires cleanup',
    detail: input.geometrySeed.message,
    timeLabel: formatTimeLabel(input.geometrySeed.checkedAt),
    tone: input.geometrySeed.promotable ? 'success' : 'warning',
  });

  if (!input.bakkiCore.configured || !input.bakkiCore.ok) {
    items.push({
      id: 'persisted-geometry-unavailable',
      label: 'Persisted geometry unavailable',
      detail: 'Bakki Core is not connected, so persisted ranch, zone, and area counts are unavailable.',
      timeLabel: formatTimeLabel(input.checkedAt),
      tone: 'warning',
    });
  } else if (
    input.geometryPersistence.ranchCount === 0
    && input.geometryPersistence.zoneCount === 0
    && input.geometryPersistence.areaCount === 0
  ) {
    items.push({
      id: 'persisted-geometry-missing',
      label: 'Persisted geometry missing',
      detail: 'Bakki Core is connected, but no ranch, zone, or area geometry rows are persisted yet.',
      timeLabel: formatTimeLabel(input.checkedAt),
      tone: 'warning',
    });
  } else if (
    input.geometryPersistence.ranchCount === 0
    || input.geometryPersistence.zoneCount === 0
    || input.geometryPersistence.areaCount === 0
  ) {
    items.push({
      id: 'persisted-geometry-incomplete',
      label: 'Persisted geometry incomplete',
      detail: `${input.geometryPersistence.ranchCount} ranch, ${input.geometryPersistence.zoneCount} zones, and ${input.geometryPersistence.areaCount} areas are currently persisted in Bakki Core.`,
      timeLabel: formatTimeLabel(input.checkedAt),
      tone: 'warning',
    });
  } else {
    items.push({
      id: 'persisted-geometry-present',
      label: 'Persisted geometry present',
      detail: `${input.geometryPersistence.ranchCount} ranch, ${input.geometryPersistence.zoneCount} zones, and ${input.geometryPersistence.areaCount} areas are currently persisted in Bakki Core.`,
      timeLabel: formatTimeLabel(input.checkedAt),
      tone: 'success',
    });
  }

  return items;
}

export function buildRecommendedActions(input: {
  bakkiCore: SettingsOdooDiagnostics['bakkiCore'];
  geometryPersistence: SettingsOdooDiagnostics['geometryPersistence'];
  geometrySeed: SettingsOdooDiagnostics['geometrySeed'];
  media: SettingsOdooDiagnostics['media'];
  mirrors: SettingsOdooDiagnostics['mirrors'];
  odoo: SettingsOdooDiagnostics['odoo'];
  taskSync: SettingsOdooDiagnostics['taskSync'];
}) {
  const items: SettingsOdooDiagnostics['recommendedActions'] = [];

  if (input.odoo.credentialSource === 'api_keys_file') {
    items.push({
      id: 'move-odoo-secret',
      label: 'Move Odoo API key into runtime secrets',
      detail: 'Set ODOO_API_KEY in runtime secrets and remove the local API_Keys.txt fallback before treating deployment as ready.',
      command: null,
    });
  }

  if (!input.taskSync.writeReady) {
    items.push({
      id: 'provision-odoo-task-sync',
      label: 'Provision Odoo task sync prerequisites',
      detail: 'Create or verify the default project and standard task stages so Bakki task writes stay mapped to pending, in_progress, done, and cancelled.',
      command: 'yarn odoo:bootstrap --json',
    });
  }

  if (!input.bakkiCore.configured || !input.bakkiCore.ok) {
    items.push({
      id: 'fix-bakki-core-connectivity',
      label: 'Restore Bakki Core connectivity',
      detail: input.bakkiCore.configured
        ? 'Start PostgreSQL/PostGIS at the configured host and port or correct the Bakki Core DB connection settings, then rerun the bootstrap and mirror sync commands.'
        : 'Configure BAKKI_CORE_DATABASE_URL or the BAKKI_CORE_DB_* fields first, then bootstrap Bakki Core and sync mirrors.',
      command: 'yarn bakki-core:db:doctor',
    });
  }

  if (input.bakkiCore.configured && input.bakkiCore.ok && input.bakkiCore.postgisAvailable === false) {
    items.push({
      id: 'enable-postgis',
      label: 'Enable PostGIS in Bakki Core',
      detail: 'Install or enable the PostGIS extension in the target database, then rerun the direct Bakki Core verification command.',
      command: 'yarn bakki-core:verify --json',
    });
  }

  if (input.bakkiCore.configured && input.bakkiCore.ok && input.bakkiCore.migrationTablePresent === false) {
    items.push({
      id: 'run-bakki-core-migrations',
      label: 'Run Bakki Core migrations',
      detail: 'Initialize the Bakki Core schema before syncing mirrors, geometry, or audit data.',
      command: 'yarn bakki-core:bootstrap --json',
    });
  }

  if (!input.geometrySeed.promotable && !input.geometrySeed.overrideEnabled) {
    items.push({
      id: 'review-geometry-seed',
      label: 'Review and clean the ranch/zone geometry seed',
      detail: 'Inspect the generated debug viewer, fix containment or overlap issues in the source KML, then rerun seed validation before bootstrap.',
      command: 'yarn seed:geometry:view',
    });
  }

  if (
    input.bakkiCore.configured
    && input.bakkiCore.ok
    && (
      input.geometryPersistence.ranchCount === 0
      || input.geometryPersistence.zoneCount === 0
      || input.geometryPersistence.areaCount === 0
    )
  ) {
    items.push({
      id: 'bootstrap-or-import-geometry',
      label: 'Persist Bakki Core geometry',
      detail:
        input.geometryPersistence.ranchCount === 0
        && input.geometryPersistence.zoneCount === 0
        && input.geometryPersistence.areaCount === 0
          ? 'Run Bakki Core bootstrap to seed ranch and zone geometry, then import real area polygons when they are available.'
          : 'Complete the remaining ranch, zone, and area geometry imports so the live map stops depending on incomplete persisted geometry.',
      command: 'yarn bakki-core:bootstrap --json',
    });
  }

  if (!input.media.configured) {
    items.push({
      id: 'configure-spaces',
      label: 'Configure Spaces and rerun the media probe',
      detail: 'Set the Spaces bucket, endpoint, region, key, and secret, then verify signed upload, read, and cleanup against the real bucket.',
      command: 'yarn media:probe-upload --json',
    });
  }

  const retrying = input.mirrors.users.retryingCount + input.mirrors.tasks.retryingCount;
  if (retrying > 0) {
    items.push({
      id: 'clear-mirror-retries',
      label: 'Clear mirror retry state',
      detail: `${retrying} mirrored record${retrying === 1 ? ' is' : 's are'} still carrying retry state. Refresh mirrors and inspect any remaining sync errors before promotion.`,
      command: 'yarn odoo:sync --json',
    });
  }

  return items;
}

export function buildDeploymentBlockers(input: {
  bakkiCore: SettingsOdooDiagnostics['bakkiCore'];
  geometryPersistence: SettingsOdooDiagnostics['geometryPersistence'];
  geometrySeed: SettingsOdooDiagnostics['geometrySeed'];
  media: SettingsOdooDiagnostics['media'];
  mirrors: SettingsOdooDiagnostics['mirrors'];
  odoo: SettingsOdooDiagnostics['odoo'];
  taskSync: SettingsOdooDiagnostics['taskSync'];
  weather: SettingsOdooDiagnostics['weather'];
}) {
  const items: SettingsOdooDiagnostics['deploymentBlockers'] = [];

  if (!input.odoo.reachable) {
    items.push({
      id: 'odoo-unreachable',
      label: 'Odoo unreachable',
      detail: 'Odoo Online is currently unreachable. Check service credentials and tenant API availability first.',
    });
    return items;
  }

  if (input.odoo.credentialSource === 'api_keys_file') {
    items.push({
      id: 'odoo-api-keys-fallback',
      label: 'Odoo credentials still using local fallback',
      detail: 'Odoo service credentials are still coming from API_Keys.txt fallback. Move them into runtime secrets before treating deployment as ready.',
    });
  }

  if (!input.taskSync.writeReady) {
    items.push({
      id: 'odoo-task-sync-not-ready',
      label: 'Odoo task sync not ready',
      detail: input.taskSync.message,
    });
  }

  if (!input.bakkiCore.configured || !input.bakkiCore.ok) {
    items.push({
      id: 'bakki-core-unhealthy',
      label: 'Bakki Core not healthy',
      detail: 'Bakki Core is not healthy. Fix the PostgreSQL/PostGIS connection before trusting sync results.',
    });
  }

  if (input.bakkiCore.configured && input.bakkiCore.ok && input.bakkiCore.postgisAvailable === false) {
    items.push({
      id: 'bakki-core-postgis-missing',
      label: 'PostGIS extension missing',
      detail: 'Bakki Core is reachable, but the PostGIS extension is missing. Install or enable PostGIS before treating geometry persistence as ready.',
    });
  }

  if (input.bakkiCore.configured && input.bakkiCore.ok && input.bakkiCore.migrationTablePresent === false) {
    items.push({
      id: 'bakki-core-migrations-missing',
      label: 'Bakki Core migrations not initialized',
      detail: 'Bakki Core is reachable, but the migration table is missing. Run Bakki Core migrations or bootstrap before syncing mirrors or geometry.',
    });
  }

  if (!input.geometrySeed.promotable && !input.geometrySeed.overrideEnabled) {
    items.push({
      id: 'geometry-seed-blocked',
      label: 'Geometry seed blocked',
      detail: 'The current ranch/zone seed geometry is blocked from promotion. Clean the source geometry or explicitly enable the override only for deliberate local provisional testing.',
    });
  } else if (!input.geometrySeed.promotable && input.geometrySeed.overrideEnabled) {
    items.push({
      id: 'geometry-seed-override',
      label: 'Geometry seed override active',
      detail: 'The geometry seed override is active. Bakki can use provisional ranch/zone geometry in this environment, but that state is not suitable for normal deployment.',
    });
  }

  if (input.bakkiCore.configured && input.bakkiCore.ok) {
    if (
      input.geometryPersistence.ranchCount === 0
      && input.geometryPersistence.zoneCount === 0
      && input.geometryPersistence.areaCount === 0
    ) {
      items.push({
        id: 'persisted-geometry-missing',
        label: 'No persisted geometry',
        detail: 'Bakki Core is healthy, but no persisted ranch, zone, or area geometry exists yet. Run bootstrap after fixing the seed or import corrected geometry before treating maps as live.',
      });
    } else if (
      input.geometryPersistence.ranchCount === 0
      || input.geometryPersistence.zoneCount === 0
      || input.geometryPersistence.areaCount === 0
    ) {
      items.push({
        id: 'persisted-geometry-partial',
        label: 'Persisted geometry incomplete',
        detail: 'Bakki Core geometry is only partially persisted. Complete ranch, zone, and area imports before treating maps as live.',
      });
    }
  }

  if (!input.media.configured) {
    items.push({
      id: 'media-not-configured',
      label: 'Spaces not configured',
      detail: 'DigitalOcean Spaces is still not configured. Media uploads will remain unavailable until provider secrets are present.',
    });
  }

  const retrying = input.mirrors.users.retryingCount + input.mirrors.tasks.retryingCount;
  if (retrying > 0) {
    items.push({
      id: 'mirror-retries-present',
      label: 'Mirror retries pending',
      detail: `${retrying} mirrored record${retrying === 1 ? ' is' : 's are'} carrying sync retry state. Clear those before promoting deployment.`,
    });
  }

  return items;
}

export function buildBakkiCoreBootstrapMessage(
  geometrySeed: SettingsOdooDiagnostics['geometrySeed'],
  prefix: string,
) {
  if (geometrySeed.promotable) {
    return prefix;
  }

  return `${prefix} Geometry seed is not promotable yet; current ranch/zone validation still reports containment or overlap failures.`;
}

function formatTimeLabel(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(value)) + ' UTC';
}
