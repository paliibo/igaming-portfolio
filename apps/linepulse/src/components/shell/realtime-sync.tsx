'use client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useBetSettled,
  useEventUpdates,
  useMarketStatusUpdates,
  useMe,
  useOddsUpdates,
} from '@igaming/api-client';
import { useBetslipStore } from '@/lib/betslip-store';
import { useFlashStore } from '@/lib/flash-store';
import { formatCredits } from '@/lib/format';
import { priceDirection } from '@/lib/odds';
import { patchEventEverywhere } from '@/lib/sportsbook';

/** Applies realtime pushes to every cached event list/detail, the betslip and the odds flash markers. */
export function RealtimeSync() {
  const qc = useQueryClient();
  const me = useMe();
  const syncPrice = useBetslipStore((s) => s.syncPrice);
  const flash = useFlashStore((s) => s.flash);

  useOddsUpdates((payload) => {
    patchEventEverywhere(qc, payload.eventId, (event) => ({
      ...event,
      markets: event.markets.map((market) =>
        market.id !== payload.marketId
          ? market
          : {
              ...market,
              selections: market.selections.map((selection) =>
                selection.id !== payload.selectionId ||
                selection.priceVersion >= payload.priceVersion
                  ? selection
                  : {
                      ...selection,
                      priceMilli: payload.priceMilli,
                      priceVersion: payload.priceVersion,
                      priceUpdatedAt: payload.updatedAt,
                    },
              ),
            },
      ),
    }));
    syncPrice(payload.selectionId, payload.priceMilli);
    const direction = priceDirection(payload.previousPriceMilli, payload.priceMilli);
    if (direction) flash(payload.selectionId, direction);
  });

  useMarketStatusUpdates((payload) => {
    patchEventEverywhere(qc, payload.eventId, (event) => ({
      ...event,
      markets: event.markets.map((market) =>
        market.id === payload.marketId ? { ...market, status: payload.status } : market,
      ),
    }));
  });

  useEventUpdates((payload) => {
    patchEventEverywhere(qc, payload.eventId, (event) => ({
      ...event,
      status: payload.status,
      homeScore: payload.homeScore,
      awayScore: payload.awayScore,
      clockMinute: payload.clockMinute,
      periodLabel: payload.periodLabel,
    }));
    if (payload.status === 'SETTLED' || payload.status === 'CANCELLED')
      void qc.invalidateQueries({ queryKey: ['sportsbook', 'events'] });
  });

  useBetSettled((payload) => {
    if (!me.data) return;
    const label =
      payload.status === 'WON'
        ? `Bet won · ${formatCredits(payload.payoutMinor)} paid out`
        : payload.status === 'VOID'
          ? `Bet voided · ${formatCredits(payload.payoutMinor)} refunded`
          : payload.status === 'CANCELLED'
            ? `Bet cancelled · ${formatCredits(payload.payoutMinor)} refunded`
            : 'Bet settled as lost';
    toast(label, {
      description: `Bet ${payload.betId.slice(0, 8)}`,
      id: `bet-settled-${payload.betId}`,
    });
  });

  return null;
}
