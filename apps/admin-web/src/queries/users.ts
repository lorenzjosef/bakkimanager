import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  buildGeneratedUserLoginCandidate,
  type CreateUserRequest,
  type CreateUserResponse,
  type UpdateUserStatusRequest,
  type UpdateUserStatusResponse,
  type UserManagementData,
  type UserRoleDesignation,
} from '@bakki/domain';
import { fetchApiJson, patchApiJson, postApiJson } from '@/lib/api';
import {
  CREATE_USER_INVALIDATION_QUERY_KEYS,
  UPDATE_USER_STATUS_INVALIDATION_QUERY_KEYS,
} from '@/queries/mutation-invalidation-utils';
import { invalidateQueryKeys } from '@/queries/query-invalidation';
import { USERS_PAGE_QUERY_KEY } from '@/queries/query-keys';

export function useUserManagementData(role: UserRoleDesignation) {
  return useQuery({
    queryKey: [...USERS_PAGE_QUERY_KEY, role],
    queryFn: () =>
      fetchApiJson<UserManagementData>(`/users/management?role=${encodeURIComponent(role)}`),
    staleTime: 60_000, // User data refreshes every minute
    retry: false,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserRequest) =>
      postApiJson<CreateUserResponse>('/users', payload),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, CREATE_USER_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      userId,
    }: {
      payload: UpdateUserStatusRequest;
      userId: string;
    }) =>
      patchApiJson<UpdateUserStatusResponse>(`/users/${encodeURIComponent(userId)}/status`, payload),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, UPDATE_USER_STATUS_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function buildUserPreviewUsername(firstName: string, lastName: string) {
  return buildGeneratedUserLoginCandidate(firstName, lastName);
}
