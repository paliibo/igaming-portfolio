'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CasinoGameDto,
  GameCategory,
  GameDetailDto,
  GameRoundDto,
  GameSessionDto,
  Page,
  PlayRoundInput,
  PlayRoundResponse,
  UpdateGameInput,
} from '@igaming/contracts';
import { apiFetch, queryKeys, useApplyWalletSnapshot } from '@igaming/api-client';

export type GamesFilter = {
  category?: GameCategory;
  search?: string;
  featured?: boolean;
};

export function useGames(filter: GamesFilter = {}) {
  return useQuery({
    queryKey: queryKeys.games(filter),
    queryFn: () =>
      apiFetch<CasinoGameDto[]>('/casino/games', {
        query: {
          category: filter.category,
          search: filter.search,
          featured: filter.featured ? true : undefined,
        },
      }),
  });
}

export function useGame(slug: string) {
  return useQuery({
    queryKey: queryKeys.game(slug),
    queryFn: () => apiFetch<GameDetailDto>(`/casino/games/${slug}`),
  });
}

export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: () => apiFetch<CasinoGameDto[]>('/casino/favorites'),
    enabled,
  });
}

function patchGameEverywhere(
  qc: ReturnType<typeof useQueryClient>,
  gameId: string,
  isFavorite: boolean,
) {
  qc.setQueriesData<CasinoGameDto[]>({ queryKey: ['casino', 'games'] }, (games) =>
    games?.map((g) => (g.id === gameId ? { ...g, isFavorite } : g)),
  );
  qc.setQueriesData<GameDetailDto>({ queryKey: ['casino', 'game'] }, (game) =>
    game && game.id === gameId ? { ...game, isFavorite } : game,
  );
  qc.setQueryData<CasinoGameDto[]>(queryKeys.favorites, (games) => {
    if (!games) return games;
    if (isFavorite) return games;
    return games.filter((g) => g.id !== gameId);
  });
}

/** Optimistic favourite toggle: flips every cached copy of the game immediately, rolls back on failure. */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gameId, isFavorite }: { gameId: string; isFavorite: boolean }) =>
      apiFetch<{ isFavorite: boolean }>(`/casino/favorites/${gameId}`, {
        method: isFavorite ? 'PUT' : 'DELETE',
      }),
    onMutate: async ({ gameId, isFavorite }) => {
      await qc.cancelQueries({ queryKey: ['casino'] });
      patchGameEverywhere(qc, gameId, isFavorite);
      return { gameId, previous: !isFavorite };
    },
    onError: (_error, _vars, context) => {
      if (context) patchGameEverywhere(qc, context.gameId, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.favorites });
    },
  });
}

export type RoundsFilter = {
  gameSlug?: string;
  limit?: number;
};

export function useRounds(filter: RoundsFilter = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.rounds(filter),
    queryFn: ({ pageParam }) =>
      apiFetch<Page<GameRoundDto>>('/casino/rounds', { query: { ...filter, cursor: pageParam } }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

export function useRound(id: string | null) {
  return useQuery({
    queryKey: ['casino', 'round', id] as const,
    queryFn: () => apiFetch<GameRoundDto>(`/casino/rounds/${id}`),
    enabled: id !== null,
  });
}

export function createGameSession(gameSlug: string) {
  return apiFetch<GameSessionDto>('/casino/sessions', { method: 'POST', body: { gameSlug } });
}

export function closeGameSession(id: string) {
  return apiFetch<GameSessionDto>(`/casino/sessions/${id}/close`, { method: 'POST' });
}

/** Plays one round; pushes the returned wallet snapshot into the cache and refreshes history views. */
export function usePlayRound(gameSlug: string) {
  const qc = useQueryClient();
  const applyWallet = useApplyWalletSnapshot();
  return useMutation({
    mutationFn: (input: PlayRoundInput) =>
      apiFetch<PlayRoundResponse>('/casino/rounds', { method: 'POST', body: input }),
    onSuccess: (data) => {
      applyWallet(data.wallet);
      void qc.invalidateQueries({ queryKey: ['casino', 'rounds'] });
      void qc.invalidateQueries({ queryKey: queryKeys.game(gameSlug) });
    },
  });
}

export function useOperatorGames(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.games,
    queryFn: () => apiFetch<CasinoGameDto[]>('/casino/operator/games'),
    enabled,
  });
}

export function useUpdateGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateGameInput }) =>
      apiFetch<CasinoGameDto>(`/casino/operator/games/${id}`, { method: 'PATCH', body: patch }),
    onSuccess: (game) => {
      qc.setQueryData<CasinoGameDto[]>(queryKeys.admin.games, (games) =>
        games?.map((g) => (g.id === game.id ? { ...g, ...game } : g)),
      );
      void qc.invalidateQueries({ queryKey: ['casino'] });
    },
  });
}
