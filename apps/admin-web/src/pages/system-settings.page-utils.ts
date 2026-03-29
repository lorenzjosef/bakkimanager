import type { OdooConnectionHealth, SettingsOdooDiagnostics } from '@bakki/domain';

export type SettingsVariant = 'general' | 'odoo' | 'notifications' | 'map';

export interface SettingsTab {
  id: SettingsVariant;
  label: string;
  path: '/settings/general' | '/settings/odoo' | '/settings/notifications' | '/settings/map';
}

export const SETTINGS_TABS: SettingsTab[] = [
  { id: 'general', label: 'General', path: '/settings/general' },
  { id: 'odoo', label: 'Odoo', path: '/settings/odoo' },
  { id: 'notifications', label: 'Notifications', path: '/settings/notifications' },
  { id: 'map', label: 'Map', path: '/settings/map' },
];

export function getSettingsTitle(variant: SettingsVariant) {
  switch (variant) {
    case 'general':
      return 'General Settings';
    case 'odoo':
      return 'Odoo Settings';
    case 'notifications':
      return 'Notification Settings';
    case 'map':
      return 'Map Settings';
  }
}

export function getOdooCredentialSourceLabel(
  credentialSource: OdooConnectionHealth['credentialSource'] | undefined,
) {
  switch (credentialSource) {
    case 'environment':
      return 'Runtime env';
    case 'api_keys_file':
      return 'API_Keys.txt fallback';
    default:
      return 'Missing';
  }
}

export function getOdooConnectionStatusLabel(diagnostics: SettingsOdooDiagnostics | undefined) {
  return diagnostics?.odoo.reachable ? 'Active' : 'Attention';
}

export function getOdooConnectionDescription(
  diagnostics: SettingsOdooDiagnostics | undefined,
  errorMessage?: string,
) {
  if (diagnostics?.odoo.reachable) {
    return 'Authorized access to the Bakki Odoo Online tenant.';
  }

  if (errorMessage) {
    return 'Live Odoo diagnostics are unavailable; showing fallback values.';
  }

  return 'Odoo Online service diagnostics are still loading.';
}

export function getBakkiCorePersistenceLabel(diagnostics: SettingsOdooDiagnostics | undefined) {
  return diagnostics?.bakkiCore.configured && diagnostics?.bakkiCore.ok ? 'Connected' : 'Not configured';
}

export function getMirrorPersistenceLabel(diagnostics: SettingsOdooDiagnostics | undefined) {
  return diagnostics?.bakkiCore.configured && diagnostics?.bakkiCore.ok
    ? 'Enabled'
    : 'Disabled in this environment';
}

export function resolveLastSuccessfulSyncTimestamp(diagnostics: SettingsOdooDiagnostics | undefined) {
  return diagnostics?.mirrors.tasks.lastSuccessAt
    || diagnostics?.mirrors.users.lastSuccessAt
    || diagnostics?.checkedAt
    || null;
}

export function getDeploymentBlockerSummary(diagnostics: SettingsOdooDiagnostics | undefined) {
  if (!diagnostics) {
    return 'Checking';
  }

  return `${diagnostics.deploymentBlockers.length} open`;
}

export function getRecommendedActionSummary(diagnostics: SettingsOdooDiagnostics | undefined) {
  if (!diagnostics) {
    return 'Checking';
  }

  return `${diagnostics.recommendedActions.length} queued`;
}

export function getWeatherFeedStatusLabel(diagnostics: SettingsOdooDiagnostics | undefined) {
  if (!diagnostics) {
    return 'Checking';
  }

  return diagnostics.weather.available ? 'Reachable' : 'Unavailable';
}
