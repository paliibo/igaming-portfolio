'use client';
import * as React from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { apiFetch } from '@igaming/api-client';
import type { Page } from '@igaming/contracts';

export type QueryFilters = Record<string, string | number | boolean | undefined | null>;

export interface CursorQueryOptions {
  enabled?: boolean;
  limit?: number;
  refetchInterval?: number;
}

export interface CursorQueryResult<T> {
  items: T[];
  query: UseInfiniteQueryResult<InfiniteData<Page<T>>>;
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

/** Cursor pagination over `Page<T>` endpoints: flattens pages and exposes a "load more" action. */
export function useCursorQuery<T>(
  queryKey: readonly unknown[],
  path: string,
  filters: QueryFilters,
  options: CursorQueryOptions = {},
): CursorQueryResult<T> {
  const limit = options.limit ?? 25;
  const query = useInfiniteQuery({
    queryKey: [...queryKey, { limit }],
    queryFn: ({ pageParam, signal }) =>
      apiFetch<Page<T>>(path, { query: { ...filters, limit, cursor: pageParam }, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
    refetchInterval: options.refetchInterval,
  });

  const items = React.useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const loadMore = React.useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [query]);
  const refetch = React.useCallback(() => void query.refetch(), [query]);

  return {
    items,
    query,
    hasMore: query.hasNextPage,
    loadMore,
    isLoadingMore: query.isFetchingNextPage,
    isPending: query.isPending,
    isError: query.isError,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
  };
}
