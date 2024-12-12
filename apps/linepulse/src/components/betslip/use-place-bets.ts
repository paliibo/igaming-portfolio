'use client';
import * as React from 'react';
import type { PriceChange } from '@igaming/contracts';
import { ApiError, newIdempotencyKey, useApplyWalletSnapshot } from '@igaming/api-client';
import { useBetslipStore } from '@/lib/betslip-store';
import { describeBetError } from '@/lib/errors';
import { usePlaceBet } from '@/lib/sportsbook';

export interface PlaceOutcome {
  placed: number;
  error: string | null;
}

/** Places the current slip: one accumulator request, or one request per selection in singles mode. */
export function usePlaceBets() {
  const placeBet = usePlaceBet();
  const applyWallet = useApplyWalletSnapshot();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const place = React.useCallback(
    async (stakeMinor: string, acceptPriceChanges = false): Promise<PlaceOutcome> => {
      const store = useBetslipStore.getState();
      setError(null);
      setPending(true);
      let placed = 0;
      try {
        const batches =
          store.mode === 'accumulator' && store.selections.length > 1
            ? [store.selections]
            : store.selections.map((s) => [s]);
        for (const batch of batches) {
          const result = await placeBet.mutateAsync({
            idempotencyKey: newIdempotencyKey(),
            stakeMinor,
            selections: batch.map((s) => ({
              selectionId: s.selectionId,
              priceMilli: s.priceMilli,
            })),
            acceptPriceChanges,
          });
          applyWallet(result.wallet);
          useBetslipStore.getState().recordPlaced({ bet: result.bet, wallet: result.wallet });
          for (const s of batch) useBetslipStore.getState().remove(s.selectionId);
          placed += 1;
        }
        useBetslipStore.getState().setStake('');
        return { placed, error: null };
      } catch (err) {
        if (ApiError.is(err, 'PRICE_CHANGED')) {
          const changes = (
            (err.details as { changes?: PriceChange[] } | undefined)?.changes ?? []
          ).filter((c) => typeof c.selectionId === 'string');
          useBetslipStore.getState().setPriceChanges(changes);
          const message =
            'Odds changed while placing. Review the new prices and accept to continue.';
          setError(message);
          return { placed, error: message };
        }
        const message = describeBetError(err);
        setError(message);
        return { placed, error: message };
      } finally {
        setPending(false);
      }
    },
    [placeBet, applyWallet],
  );

  return { place, pending, error, clearError: () => setError(null) };
}
