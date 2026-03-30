import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type CreateTaskRequest,
  type CreateTaskResponse,
  type RecordMonitoringResultRequest,
  type RecordMonitoringResultResponse,
  type TaskManagementData,
  type TaskTemplateSummary,
  type UpdateTaskWorkflowRequest,
  type UpdateTaskWorkflowResponse,
} from '@bakki/domain';
import { fetchApiJson, patchApiJson, postApiJson } from '@/lib/api';
import {
  DASHBOARD_SUMMARY_QUERY_KEY,
  MAP_MANAGEMENT_DATA_QUERY_KEY,
  MAP_VIEWER_DATA_QUERY_KEY,
  TASK_MANAGEMENT_QUERY_KEY,
  TASK_TEMPLATES_QUERY_KEY,
} from '@/queries/query-keys';
import {
  CREATE_TASK_INVALIDATION_QUERY_KEYS,
  RECORD_MONITORING_RESULT_INVALIDATION_QUERY_KEYS,
  UPDATE_TASK_WORKFLOW_INVALIDATION_QUERY_KEYS,
} from '@/queries/mutation-invalidation-utils';
import { invalidateQueryKeys } from '@/queries/query-invalidation';

export function useTaskManagementData() {
  return useQuery({
    queryKey: TASK_MANAGEMENT_QUERY_KEY,
    queryFn: () => fetchApiJson<TaskManagementData>('/tasks/summary'),
    staleTime: 30_000,
    retry: false,
  });
}

export function useTaskTemplatesData() {
  return useQuery({
    queryKey: TASK_TEMPLATES_QUERY_KEY,
    queryFn: () => fetchApiJson<TaskTemplateSummary[]>('/tasks/templates'),
    staleTime: 300_000, // Templates change rarely, cache for 5 minutes
    retry: false,
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskRequest) =>
      postApiJson<CreateTaskResponse>('/tasks', payload),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, CREATE_TASK_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useRecordMonitoringResultMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      taskId,
    }: {
      payload: RecordMonitoringResultRequest;
      taskId: string;
    }) =>
      postApiJson<RecordMonitoringResultResponse>(
        `/tasks/${encodeURIComponent(taskId)}/monitoring-result`,
        payload,
      ),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, RECORD_MONITORING_RESULT_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useUpdateTaskWorkflowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      taskId,
    }: {
      payload: UpdateTaskWorkflowRequest;
      taskId: string;
    }) =>
      patchApiJson<UpdateTaskWorkflowResponse>(
        `/tasks/${encodeURIComponent(taskId)}/workflow-state`,
        payload,
      ),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, UPDATE_TASK_WORKFLOW_INVALIDATION_QUERY_KEYS);
    },
  });
}
