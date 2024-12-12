'use client';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@igaming/ui';
import type { PlacedBetSummary } from '@/lib/betslip-store';
import { formatCredits } from '@/lib/format';
import { formatPriceMilli } from '@/lib/odds';
import { LinkButton } from '@/components/ui/link-button';

export function BetConfirmation({
  placed,
  onDismiss,
}: {
  placed: PlacedBetSummary[];
  onDismiss: () => void;
}) {
  const latestWallet = placed[placed.length - 1]?.wallet;
  return (
    <div
      data-testid="bet-confirmation"
      role="status"
      aria-live="polite"
      className="space-y-3 rounded-lg border border-success/40 bg-success/5 p-3 animate-fade-in-up"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-success">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        {placed.length === 1 ? 'Bet placed' : `${placed.length} bets placed`}
      </div>
      <ul className="space-y-2">
        {placed.map(({ bet }) => (
          <li key={bet.id} className="rounded-md border border-border bg-card p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-muted-foreground" title={bet.id}>
                #{bet.id.slice(0, 8)}
              </span>
              <span className="text-muted-foreground">
                {bet.selections.length === 1 ? 'Single' : `${bet.selections.length}-fold`}
              </span>
            </div>
            <ul className="mt-1.5 space-y-0.5">
              {bet.selections.map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="font-medium text-foreground">{s.selectionName}</span>{' '}
                    <span className="text-muted-foreground">· {s.eventName}</span>
                  </span>
                  <span className="tabular-nums">{formatPriceMilli(s.priceMilli)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-2 tabular-nums">
              <div>
                <dt className="text-muted-foreground">Stake</dt>
                <dd className="font-medium">{formatCredits(bet.stakeMinor)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Odds</dt>
                <dd className="font-medium">{formatPriceMilli(bet.totalPriceMilli)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">To return</dt>
                <dd className="font-medium text-success">
                  {formatCredits(bet.potentialPayoutMinor)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      {latestWallet ? (
        <p className="text-xs text-muted-foreground">
          New balance:{' '}
          <span className="font-medium tabular-nums text-foreground">
            {formatCredits(latestWallet.balanceMinor)}
          </span>
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={onDismiss}>
          Done
        </Button>
        <LinkButton size="sm" variant="outline" className="flex-1" href="/bets">
          My bets
        </LinkButton>
      </div>
    </div>
  );
}
