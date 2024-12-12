'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, LoginInput, RegisterInput, UserDto } from '@igaming/contracts';
import { ApiError, apiFetch } from '../client';
import { queryKeys } from '../query-keys';

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async (): Promise<UserDto | null> => {
      try {
        const res = await apiFetch<AuthResponse>('/auth/me');
        return res.user;
      } catch (error) {
        if (ApiError.is(error) && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: input }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.me, data.user);
      void qc.invalidateQueries();
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: input }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.me, data.user);
      void qc.invalidateQueries();
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(queryKeys.me, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
    },
  });
}
