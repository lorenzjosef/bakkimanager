import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BakkiCoreBootstrapRunResult,
  BakkiCoreMigrationRunResult,
  MediaSigningProbeResult,
  MediaUploadProbeResult,
  OdooMirrorSyncRunResult,
  OdooTaskSyncProvisionResult,
  OdooTaskWriteProbeResult,
  SettingsOdooDiagnostics,
} from '@bakki/domain';
import { fetchApiJson, postApiJson } from '../lib/api';
import {
  HEALTH_ODOO_QUERY_KEY,
} from './query-keys';
import {
  BAKKI_CORE_BOOTSTRAP_INVALIDATION_QUERY_KEYS,
  BAKKI_CORE_MIGRATION_INVALIDATION_QUERY_KEYS,
  MEDIA_PROBE_INVALIDATION_QUERY_KEYS,
  ODOO_SYNC_INVALIDATION_QUERY_KEYS,
  ODOO_TASK_SYNC_INVALIDATION_QUERY_KEYS,
} from './settings.invalidate-utils';
import { invalidateQueryKeys } from './query-invalidation';

export function useOdooDiagnosticsData() {
  return useQuery({
    queryKey: HEALTH_ODOO_QUERY_KEY,
    queryFn: () => fetchApiJson<SettingsOdooDiagnostics>('/health/odoo'),
    staleTime: 60_000,
  });
}

export function useRunOdooSyncNowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postApiJson<OdooMirrorSyncRunResult>('/health/odoo/sync-now', {}),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, ODOO_SYNC_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useRunBakkiCoreMigrationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postApiJson<BakkiCoreMigrationRunResult>('/health/bakki-core/migrate', {}),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, BAKKI_CORE_MIGRATION_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useRunBakkiCoreBootstrapMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postApiJson<BakkiCoreBootstrapRunResult>('/health/bakki-core/bootstrap', {}),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, BAKKI_CORE_BOOTSTRAP_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useRunOdooTaskWriteProbeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postApiJson<OdooTaskWriteProbeResult>('/health/odoo/task-write-probe', {}),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, ODOO_TASK_SYNC_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useProvisionOdooTaskSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postApiJson<OdooTaskSyncProvisionResult>('/health/odoo/provision-task-sync', {}),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, ODOO_TASK_SYNC_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useRunMediaSigningProbeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postApiJson<MediaSigningProbeResult>('/health/media/signing-probe', {}),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, MEDIA_PROBE_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useRunMediaUploadProbeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => postApiJson<MediaUploadProbeResult>('/health/media/upload-probe', {}),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, MEDIA_PROBE_INVALIDATION_QUERY_KEYS);
    },
  });
}
