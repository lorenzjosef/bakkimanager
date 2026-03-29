import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type AdjustSpeciesInventoryRequest,
  type AdjustSpeciesInventoryResponse,
  type CreateSpeciesRequest,
  type CreateSpeciesResponse,
  type SpeciesInventoryDetail,
  type SpeciesInventoryData,
  type SpeciesRecord,
  type UpdateSpeciesRequest,
  type UpdateSpeciesResponse,
} from '@bakki/domain';
import { fetchApiJson, patchApiJson, postApiJson } from '@/lib/api';
import {
  buildSpeciesDetailQueryKey,
  SPECIES_PAGE_QUERY_KEY,
} from '@/queries/query-keys';
import {
  ADJUST_SPECIES_INVENTORY_INVALIDATION_QUERY_KEYS,
  CREATE_SPECIES_INVALIDATION_QUERY_KEYS,
  buildUpdateSpeciesInvalidationQueryKeys,
} from '@/queries/mutation-invalidation-utils';
import { invalidateQueryKeys } from '@/queries/query-invalidation';

interface SpeciesListResponse {
  species: SpeciesRecord[];
}

interface SpeciesSyncStatusResponse {
  title: string;
  copy: string;
}

export function useSpeciesInventoryData() {
  return useQuery({
    queryKey: SPECIES_PAGE_QUERY_KEY,
    queryFn: async (): Promise<SpeciesInventoryData> => {
      const [listResponse, syncResponse] = await Promise.all([
        fetchApiJson<SpeciesListResponse>('/species'),
        fetchApiJson<SpeciesSyncStatusResponse>('/species/sync-status'),
      ]);

      return {
        rows: listResponse.species,
        syncTitle: syncResponse.title,
        syncCopy: syncResponse.copy,
      };
    },
    retry: false,
  });
}

export function useSpeciesDetailData(speciesId: string | null) {
  return useQuery({
    enabled: Boolean(speciesId),
    queryKey: buildSpeciesDetailQueryKey(speciesId),
    queryFn: async () => fetchApiJson<SpeciesInventoryDetail>(`/species/${encodeURIComponent(speciesId ?? '')}`),
    retry: false,
  });
}

export function useAdjustSpeciesInventoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      speciesId,
    }: {
      payload: AdjustSpeciesInventoryRequest;
      speciesId: string;
    }) =>
      postApiJson<AdjustSpeciesInventoryResponse>(
        `/species/${encodeURIComponent(speciesId)}/inventory-adjustments`,
        payload,
      ),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, ADJUST_SPECIES_INVENTORY_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useCreateSpeciesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSpeciesRequest) =>
      postApiJson<CreateSpeciesResponse>('/species', payload),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, CREATE_SPECIES_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useUpdateSpeciesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      speciesId,
    }: {
      payload: UpdateSpeciesRequest;
      speciesId: string;
    }) =>
      patchApiJson<UpdateSpeciesResponse>(`/species/${encodeURIComponent(speciesId)}`, payload),
    onSuccess: async (_, variables) => {
      await invalidateQueryKeys(queryClient, buildUpdateSpeciesInvalidationQueryKeys(variables.speciesId));
    },
  });
}
