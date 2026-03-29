import {
  type CreatePlantingPhaseRequest,
  type CreatePlantingPhaseResponse,
  type PlantingPhaseOverviewData,
  type PlantingWizardData,
} from '@bakki/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchApiJson, postApiJson } from '@/lib/api';
import {
  CREATE_PLANTING_PHASE_INVALIDATION_QUERY_KEYS,
} from '@/queries/mutation-invalidation-utils';
import { invalidateQueryKeys } from '@/queries/query-invalidation';
import {
  PLANTING_PHASE_OVERVIEW_QUERY_KEY,
  PLANTING_WIZARD_DATA_QUERY_KEY,
} from '@/queries/query-keys';
export function usePlantingPhaseOverview() {
  return useQuery({
    queryKey: PLANTING_PHASE_OVERVIEW_QUERY_KEY,
    queryFn: () => fetchApiJson<PlantingPhaseOverviewData>('/phases/overview'),
    retry: false,
  });
}

export function usePlantingWizardData() {
  return useQuery({
    queryKey: PLANTING_WIZARD_DATA_QUERY_KEY,
    queryFn: () => fetchApiJson<PlantingWizardData>('/phases/wizard'),
    retry: false,
  });
}

export function useCreatePlantingPhaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePlantingPhaseRequest) =>
      postApiJson<CreatePlantingPhaseResponse>('/phases', payload),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, CREATE_PLANTING_PHASE_INVALIDATION_QUERY_KEYS);
    },
  });
}
