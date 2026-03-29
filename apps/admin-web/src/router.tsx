import { lazy, type ComponentType } from 'react';
import { createRouter, createRoute } from '@tanstack/react-router';
import { rootRoute } from '@/routes/root';

function lazyNamedPage<TModule, TExport extends keyof TModule & string>(
  loader: () => Promise<TModule>,
  exportName: TExport,
) {
  return lazy(async () => ({
    default: (await loader())[exportName] as ComponentType<any>,
  }));
}

const LazyDashboardPage = lazyNamedPage(() => import('@/pages/DashboardPage'), 'DashboardPage');
const LazyLoginPage = lazyNamedPage(() => import('@/pages/LoginPage'), 'LoginPage');
const LazyStartupPage = lazyNamedPage(() => import('@/pages/StartupPage'), 'StartupPage');
const LazyMapManagementPage = lazyNamedPage(
  () => import('@/pages/MapManagementPage'),
  'MapManagementPage',
);
const LazyMapViewerPage = lazyNamedPage(() => import('@/pages/MapViewerPage'), 'MapViewerPage');
const LazyPlantingPhasesOverviewPage = lazyNamedPage(
  () => import('@/pages/PlantingPhasesOverviewPage'),
  'PlantingPhasesOverviewPage',
);
const LazyContractsPage = lazyNamedPage(() => import('@/pages/ContractsPage'), 'ContractsPage');
const LazyPlantingWizardPage = lazyNamedPage(
  () => import('@/pages/PlantingWizardPage'),
  'PlantingWizardPage',
);
const LazySpeciesInventoryPage = lazyNamedPage(
  () => import('@/pages/SpeciesInventoryPage'),
  'SpeciesInventoryPage',
);
const LazySupportPage = lazyNamedPage(() => import('@/pages/SupportPage'), 'SupportPage');
const LazySystemSettingsPage = lazyNamedPage(
  () => import('@/pages/SystemSettingsPage'),
  'SystemSettingsPage',
);
const LazyTaskManagementPage = lazyNamedPage(
  () => import('@/pages/TaskManagementPage'),
  'TaskManagementPage',
);
const LazyUserManagementPage = lazyNamedPage(
  () => import('@/pages/UserManagementPage'),
  'UserManagementPage',
);

const dashboardIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LazyStartupPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LazyLoginPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: LazyDashboardPage,
});

const mapViewerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/map-viewer',
  component: LazyMapViewerPage,
});

const mapManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/map-management',
  component: LazyMapManagementPage,
});

const phasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/planting-phases',
  component: LazyPlantingPhasesOverviewPage,
});

const contractsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contracts',
  component: LazyContractsPage,
});

const phaseInfoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/planting-phases/new/info',
  component: () => <LazyPlantingWizardPage step="info" />,
});

const phaseTeamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/planting-phases/new/team',
  component: () => <LazyPlantingWizardPage step="team" />,
});

const phaseAreasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/planting-phases/new/areas',
  component: () => <LazyPlantingWizardPage step="areas" />,
});

const phaseConfirmRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/planting-phases/new/confirm',
  component: () => <LazyPlantingWizardPage step="confirm" />,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: LazyUserManagementPage,
});

const speciesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/species',
  component: LazySpeciesInventoryPage,
});

const taskManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/task-management',
  component: LazyTaskManagementPage,
});

const settingsGeneralRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/general',
  component: () => <LazySystemSettingsPage variant="general" />,
});

const settingsOdooRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/odoo',
  component: () => <LazySystemSettingsPage variant="odoo" />,
});

const settingsNotificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/notifications',
  component: () => <LazySystemSettingsPage variant="notifications" />,
});

const settingsMapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/map',
  component: () => <LazySystemSettingsPage variant="map" />,
});

const supportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/support',
  component: LazySupportPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  dashboardIndexRoute,
  dashboardRoute,
  mapViewerRoute,
  mapManagementRoute,
  phasesRoute,
  contractsRoute,
  phaseInfoRoute,
  phaseTeamRoute,
  phaseAreasRoute,
  phaseConfirmRoute,
  usersRoute,
  speciesRoute,
  taskManagementRoute,
  settingsGeneralRoute,
  settingsOdooRoute,
  settingsNotificationsRoute,
  settingsMapRoute,
  supportRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
