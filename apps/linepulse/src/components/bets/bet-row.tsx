'use client';
import Link from 'next/link';
import type { BetDto, BetStatus, SelectionResult } from '@igaming/contracts';
import { Badge, cn } from '@igaming/ui';
import { formatCredits, formatDateTime } from '@/lib/format';
import { formatPriceMilli } from '@/lib/odds';

const STATUS_VARIANT: Record<BetStatus, 'brand' | 'success' | 'destructive' | 'muted' | 'warning'> =
  {
    OPEN: 'brand',
    WON: 'success',
    LOST: 'destructive',
    VOID: 'muted',
    CANCELLED: 'warning',
  };

const RESULT_CLASS: Record<SelectionResult, string> = {
  WON: 'text-success',
  LOST: 'text-destructive',
  VOID: 'text-muted-foreground',
};

export function BetRow({ bet }: { bet: BetDto }) {
  const settled = bet.status !== 'OPEN';
  const payoutLabel = settled ? 'Paid out' : 'Potential';
  const payout = settled ? (bet.payoutMinor ?? '0') : bet.potentialPayoutMinor;

  return (
    <li
      data-testid="bet-row"
      data-bet-id={bet.id}
      className="rounded-lg border border-border bg-card p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[bet.status]}>{bet.status}</Badge>
          <span className="text-xs text-muted-foreground">
            {bet.selections.length === 1 ? 'Single' : `${bet.selections.length}-fold accumulator`}
          </span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground" title={bet.id}>
          #{bet.id.slice(0, 8)}
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {bet.selections.map((s) => (
          <li key={s.id} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {s.selectionName}
                {s.result ? (
                  <span className={cn('ml-2 text-xs font-semibold', RESULT_CLASS[s.result])}>
                    {s.result}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {s.marketName} ·{' '}
                <Link
                  href={`/events/${s.eventId}`}
                  className="hover:text-foreground hover:underline"
                >
                  {s.eventName}
                </Link>
                {s.eventStatus !== 'SCHEDULED' ? (
                  <span className="ml-1 tabular-nums">
                    ({s.homeScore}:{s.awayScore}
                    {s.eventStatus === 'LIVE' ? ', live' : ''})
                  </span>
                ) : null}
              </p>
            </div>
            <span className="shrink-0 tabular-nums font-semibold">
              {formatPriceMilli(s.priceMilli)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-xs tabular-nums sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Stake</dt>
          <dd className="font-medium">{formatCredits(bet.stakeMinor)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Odds</dt>
          <dd className="font-medium">{formatPriceMilli(bet.totalPriceMilli)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{payoutLabel}</dt>
          <dd
            className={cn(
              'font-semibold',
              bet.status === 'WON'
                ? 'text-success'
                : bet.status === 'LOST'
                  ? 'text-muted-foreground'
                  : 'text-foreground',
            )}
          >
            {formatCredits(payout)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {settled && bet.settledAt ? 'Settled' : 'Placed'}
          </dt>
          <dd className="font-medium">
            {formatDateTime(settled && bet.settledAt ? bet.settledAt : bet.placedAt)}
          </dd>
        </div>
      </dl>
    </li>
  );
}

export function BetRowSkeleton() {
  return (
    <li className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
    </li>
  );
}
