export const AUTH_SESSION_QUERY_KEY = ['auth', 'session'] as const;

export const HEALTH_ODOO_QUERY_KEY = ['health', 'odoo'] as const;

export const DASHBOARD_SUMMARY_QUERY_KEY = ['dashboard-summary'] as const;
export const CONTRACTS_SUMMARY_QUERY_KEY = ['contracts-summary'] as const;

export const USERS_PAGE_QUERY_KEY = ['users-page'] as const;

export const TASK_MANAGEMENT_QUERY_KEY = ['task-management'] as const;
export const TASK_TEMPLATES_QUERY_KEY = ['task-templates'] as const;

export const SPECIES_PAGE_QUERY_KEY = ['species-page'] as const;
export function buildSpeciesDetailQueryKey(speciesId: string | null) {
  return ['species-detail', speciesId] as const;
}

export const MAP_VIEWER_DATA_QUERY_KEY = ['map-viewer-data'] as const;
export const MAP_MANAGEMENT_DATA_QUERY_KEY = ['map-management-data'] as const;
export const MAP_RANCH_GEOMETRY_QUERY_KEY = ['map-ranch-geometry'] as const;
export const MAP_ZONE_GEOMETRY_QUERY_KEY = ['map-zone-geometry'] as const;
export const MAP_AREA_GEOMETRY_QUERY_KEY = ['map-area-geometry'] as const;

export const PLANTING_PHASE_OVERVIEW_QUERY_KEY = ['planting-phase-overview'] as const;
export const PLANTING_WIZARD_DATA_QUERY_KEY = ['planting-wizard-data'] as const;

export const MEDIA_STATUS_QUERY_KEY = ['media', 'status'] as const;
export function buildObservationPhotosQueryKey(observationId: string | null) {
  return ['media', 'observation-photos', observationId] as const;
}
