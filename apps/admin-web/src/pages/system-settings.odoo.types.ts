import {
  useOdooDiagnosticsData,
  useRunBakkiCoreBootstrapMutation,
  useRunBakkiCoreMigrationsMutation,
  useRunMediaUploadProbeMutation,
  useRunMediaSigningProbeMutation,
  useProvisionOdooTaskSyncMutation,
  useRunOdooSyncNowMutation,
  useRunOdooTaskWriteProbeMutation,
} from '../queries/settings';

export type DiagnosticsData = ReturnType<typeof useOdooDiagnosticsData>['data'];
export type DiagnosticsQuery = ReturnType<typeof useOdooDiagnosticsData>;
export type BakkiCoreBootstrapMutation = ReturnType<typeof useRunBakkiCoreBootstrapMutation>;
export type BakkiCoreMigrationMutation = ReturnType<typeof useRunBakkiCoreMigrationsMutation>;
export type MediaUploadProbeMutation = ReturnType<typeof useRunMediaUploadProbeMutation>;
export type MediaProbeMutation = ReturnType<typeof useRunMediaSigningProbeMutation>;
export type ProvisionTaskSyncMutation = ReturnType<typeof useProvisionOdooTaskSyncMutation>;
export type SyncNowMutation = ReturnType<typeof useRunOdooSyncNowMutation>;
export type WriteProbeMutation = ReturnType<typeof useRunOdooTaskWriteProbeMutation>;

export const ODOO_FIELD_MAPPINGS = [
  {
    attribute: 'Tree Species',
    detail: 'Taxonomy Name',
    odooField: 'product.template / name',
    status: 'Linked',
  },
  {
    attribute: 'Survival Rate',
    detail: 'Percentage Calculation',
    odooField: 'stock.valuation / x_survival_score',
    status: 'Linked',
  },
  {
    attribute: 'Planter ID',
    detail: 'Unique Crew Reference',
    odooField: 'res.partner / ref',
    status: 'Pending',
  },
] as const;
