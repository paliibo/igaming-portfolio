'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, queryKeys } from '@igaming/api-client';
import type {
  CreateEventInput,
  MarketDto,
  SelectionDto,
  SettleEventInput,
  SportsEventDto,
  UpdateEventStateInput,
} from '@igaming/contracts';

export const OPERATOR_EVENTS_FILTERS = { scope: 'operator', status: 'all' } as const;

export function useOperatorEvents(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.events(OPERATOR_EVENTS_FILTERS),
    queryFn: () =>
      apiFetch<SportsEventDto[]>('/sportsbook/operator/events', { query: { status: 'all' } }),
    enabled,
    refetchInterval: 30_000,
  });
}

function useInvalidateSportsbook() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['sportsbook'] });
}

export function useCreateEvent() {
  const invalidate = useInvalidateSportsbook();
  return useMutation({
    mutationFn: (input: CreateEventInput) =>
      apiFetch<SportsEventDto>('/sportsbook/operator/events', { method: 'POST', body: input }),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateEventState() {
  const invalidate = useInvalidateSportsbook();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEventStateInput }) =>
      apiFetch<SportsEventDto>(`/sportsbook/operator/events/${id}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateMarketStatus() {
  const invalidate = useInvalidateSportsbook();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'OPEN' | 'SUSPENDED' | 'CLOSED' }) =>
      apiFetch<MarketDto>(`/sportsbook/operator/markets/${id}`, {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateSelectionPrice() {
  const invalidate = useInvalidateSportsbook();
  return useMutation({
    mutationFn: ({ id, priceMilli }: { id: string; priceMilli: number }) =>
      apiFetch<SelectionDto>(`/sportsbook/operator/selections/${id}/price`, {
        method: 'PATCH',
        body: { priceMilli },
      }),
    onSuccess: () => void invalidate(),
  });
}

export interface SettleResponse {
  jobId: string;
  eventId: string;
  queued: boolean;
}

export function useSettleEvent() {
  const invalidate = useInvalidateSportsbook();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SettleEventInput }) =>
      apiFetch<SettleResponse>(`/sportsbook/operator/events/${id}/settle`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => void invalidate(),
  });
}

export interface CancelSummary {
  eventId: string;
  betsSettled: number;
  betsWon: number;
  betsLost: number;
  betsVoid: number;
  paidOutMinor: string;
}

export function useCancelEvent() {
  const invalidate = useInvalidateSportsbook();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<CancelSummary>(`/sportsbook/operator/events/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => void invalidate(),
  });
}
