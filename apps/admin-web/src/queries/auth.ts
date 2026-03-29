import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type LoginRequest,
  type LoginResponse,
  type LogoutResponse,
  type ResetUserPasswordRequest,
  type ResetUserPasswordResponse,
  type SessionStatusResponse,
} from '@bakki/domain';
import { fetchApiJson, postApiJson, requestApiJson } from '@/lib/api';
import { LOGIN_INVALIDATION_QUERY_KEYS } from '@/queries/mutation-invalidation-utils';
import { invalidateQueryKeys } from '@/queries/query-invalidation';
import { AUTH_SESSION_QUERY_KEY } from '@/queries/query-keys';

export const LOGIN_REDIRECT_STORAGE_KEY = 'bakki_login_redirect';

export function useSessionStatus() {
  return useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: () => fetchApiJson<SessionStatusResponse>('/auth/session'),
    retry: false,
    staleTime: 1000 * 30,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginRequest) => postApiJson<LoginResponse>('/auth/login', payload),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, LOGIN_INVALIDATION_QUERY_KEYS);
    },
  });
}

export function useResetUserPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ResetUserPasswordRequest) =>
      postApiJson<ResetUserPasswordResponse>('/auth/reset-user-password', payload),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => requestApiJson<LogoutResponse>('/auth/logout', { method: 'POST' }),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, LOGIN_INVALIDATION_QUERY_KEYS);
    },
  });
}
