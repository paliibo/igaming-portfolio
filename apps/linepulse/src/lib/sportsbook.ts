'use client';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { apiFetch, queryKeys } from '@igaming/api-client';
import type {
  BetDto,
  Page,
  PlaceBetInput,
  PlaceBetResponse,
  SportDto,
  SportsEventDto,
} from '@igaming/contracts';

export type EventsStatusFilter = 'upcoming' | 'live' | 'finished' | 'all';

export interface EventsFilters extends Record<string, unknown> {
  status: EventsStatusFilter;
  sport?: string;
  featured?: boolean;
}

export const EVENTS_LIST_KEY = ['sportsbook', 'events'] as const;
export const EVENT_DETAIL_KEY = ['sportsbook', 'event'] as const;

export function useSports() {
  return useQuery({
    queryKey: queryKeys.sports,
    queryFn: () => apiFetch<SportDto[]>('/sportsbook/sports'),
    staleTime: 60_000,
  });
}

export function useEvents(filters: EventsFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.events(filters),
    queryFn: () =>
      apiFetch<SportsEventDto[]>('/sportsbook/events', {
        query: { status: filters.status, sport: filters.sport, featured: filters.featured },
      }),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useEvent(id: string, options: { refetchInterval?: number | false } = {}) {
  return useQuery({
    queryKey: queryKeys.event(id),
    queryFn: () => apiFetch<SportsEventDto>(`/sportsbook/events/${id}`),
    enabled: Boolean(id),
    refetchInterval: options.refetchInterval ?? false,
  });
}

export type BetsStatusFilter = 'open' | 'settled' | 'all';

export function useBets(status: BetsStatusFilter, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.bets({ status }),
    queryFn: ({ pageParam }) =>
      apiFetch<Page<BetDto>>('/sportsbook/bets', {
        query: { status, cursor: pageParam, limit: 20 },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

export function usePlaceBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceBetInput) =>
      apiFetch<PlaceBetResponse & { replayed: boolean }>('/sportsbook/bets', {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sportsbook', 'bets'] });
    },
  });
}

export function patchEventEverywhere(
  qc: QueryClient,
  eventId: string,
  updater: (event: SportsEventDto) => SportsEventDto,
) {
  qc.setQueriesData<SportsEventDto[]>({ queryKey: EVENTS_LIST_KEY }, (events) => {
    if (!events) return events;
    let changed = false;
    const next = events.map((event) => {
      if (event.id !== eventId) return event;
      changed = true;
      return updater(event);
    });
    return changed ? next : events;
  });
  qc.setQueriesData<SportsEventDto>({ queryKey: [...EVENT_DETAIL_KEY, eventId] }, (event) =>
    event ? updater(event) : event,
  );
}

export function primaryMarket(event: SportsEventDto) {
  return event.markets.find((m) => m.type === 'MATCH_WINNER') ?? event.markets[0] ?? null;
}

export function eventName(event: Pick<SportsEventDto, 'homeTeam' | 'awayTeam'>) {
  return `${event.homeTeam} vs ${event.awayTeam}`;
}
