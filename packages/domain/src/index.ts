export type BakkiViewId =
  | 'dashboard'
  | 'map-viewer'
  | 'map-management'
  | 'phase-summary'
  | 'contracts'
  | 'phase-setup-info'
  | 'phase-setup-team'
  | 'phase-setup-areas'
  | 'phase-setup-confirm'
  | 'users'
  | 'species'
  | 'task-management'
  | 'settings-general'
  | 'settings-odoo'
  | 'settings-notifications'
  | 'settings-map'
  | 'support';

export interface BakkiRouteMeta {
  path: string;
  title: string;
  navView: BakkiViewId;
  utilityView?: 'settings' | 'support';
}

export interface GeometryPoint {
  lat: number;
  lng: number;
}

export interface GeometryPolygonRecord {
  id: string;
  name: string;
  points: GeometryPoint[];
}

export * from './fixtures';
export * from './assets';
export * from './api';
export * from './auth';
export * from './contracts';
export * from './map';
export * from './media';
export * from './mobile';
export * from './phases';
export * from './settings';
export * from './species';
export * from './tasks';
export * from './users';

export const ROUTE_META: Record<BakkiViewId, BakkiRouteMeta> = {
  dashboard: { path: '/dashboard', title: 'Dashboard', navView: 'dashboard' },
  'map-viewer': { path: '/map-viewer', title: 'Map Viewer', navView: 'map-viewer' },
  'map-management': { path: '/map-management', title: 'Map Management', navView: 'map-management' },
  'phase-summary': { path: '/planting-phases', title: 'Planting Phases', navView: 'phase-summary' },
  contracts: { path: '/contracts', title: 'Contracts', navView: 'contracts' },
  'phase-setup-info': { path: '/planting-phases/new/info', title: 'Start New Planting Phase', navView: 'phase-summary' },
  'phase-setup-team': { path: '/planting-phases/new/team', title: 'Start New Planting Phase', navView: 'phase-summary' },
  'phase-setup-areas': { path: '/planting-phases/new/areas', title: 'Start New Planting Phase', navView: 'phase-summary' },
  'phase-setup-confirm': { path: '/planting-phases/new/confirm', title: 'Start New Planting Phase', navView: 'phase-summary' },
  users: { path: '/users', title: 'User Management', navView: 'users' },
  species: { path: '/species', title: 'Inventory', navView: 'species' },
  'task-management': { path: '/task-management', title: 'Task Management', navView: 'task-management' },
  'settings-general': { path: '/settings/general', title: 'General Settings', navView: 'settings-general', utilityView: 'settings' },
  'settings-odoo': { path: '/settings/odoo', title: 'Odoo Settings', navView: 'settings-odoo', utilityView: 'settings' },
  'settings-notifications': { path: '/settings/notifications', title: 'Notification Settings', navView: 'settings-notifications', utilityView: 'settings' },
  'settings-map': { path: '/settings/map', title: 'Map Settings', navView: 'settings-map', utilityView: 'settings' },
  support: { path: '/support', title: 'Support', navView: 'support', utilityView: 'support' },
};

export const VIEW_TO_PATH = Object.fromEntries(
  Object.entries(ROUTE_META).map(([viewId, meta]) => [viewId, meta.path]),
) as Record<BakkiViewId, string>;

export const SHELL_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'map-viewer', label: 'Map Viewer' },
  { id: 'map-management', label: 'Map Management' },
  { id: 'phase-summary', label: 'Planting Phases' },
  { id: 'contracts', label: 'Contracts' },
  { id: 'users', label: 'User Management' },
  { id: 'species', label: 'Inventory' },
  { id: 'task-management', label: 'Task Management' },
] as const;

export function getViewIdForPath(pathname: string): BakkiViewId {
  const normalized = pathname === '/' ? '/dashboard' : pathname;
  const match = Object.entries(ROUTE_META).find(([, meta]) => meta.path === normalized);
  return (match?.[0] as BakkiViewId | undefined) ?? 'dashboard';
}
