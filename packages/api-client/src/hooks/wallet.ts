'use client';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Page, TopupResponse, WalletDto, WalletTransactionDto } from '@igaming/contracts';
import { apiFetch, newIdempotencyKey } from '../client';
import { queryKeys } from '../query-keys';

export function useWallet(enabled = true) {
  return useQuery({
    queryKey: queryKeys.wallet,
    queryFn: () => apiFetch<WalletDto>('/wallet'),
    enabled,
    staleTime: 5_000,
  });
}

export function useWalletTransactions(
  filters: { kind?: string; limit?: number } = {},
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.walletTransactions(filters),
    queryFn: ({ pageParam }) =>
      apiFetch<Page<WalletTransactionDto>>('/wallet/transactions', {
        query: { ...filters, cursor: pageParam },
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
  });
}

export function useTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amountMinor: string) =>
      apiFetch<TopupResponse & { replayed: boolean }>('/wallet/topup', {
        method: 'POST',
        body: { amountMinor, idempotencyKey: newIdempotencyKey() },
      }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.wallet, data.wallet);
      void qc.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    },
  });
}

/** Push the wallet snapshot returned by a mutation into the cache so the balance updates instantly. */
export function useApplyWalletSnapshot() {
  const qc = useQueryClient();
  return (wallet: WalletDto) => {
    qc.setQueryData(queryKeys.wallet, wallet);
    void qc.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
  };
}
