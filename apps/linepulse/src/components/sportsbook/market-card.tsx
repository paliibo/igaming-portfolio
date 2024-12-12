'use client';
import { Lock } from 'lucide-react';
import type { MarketDto, SelectionResult, SportsEventDto } from '@igaming/contracts';
import { Badge, cn } from '@igaming/ui';
import { formatPrice } from '@/lib/format';
import { MarketStatusBadge } from './event-status';
import { OddsButton } from './odds-button';

const RESULT_VARIANT: Record<SelectionResult, 'success' | 'destructive' | 'muted'> = {
  WON: 'success',
  LOST: 'destructive',
  VOID: 'muted',
};

export function MarketCard({ event, market }: { event: SportsEventDto; market: MarketDto }) {
  const title = market.line ? `${market.name} ${market.line}` : market.name;
  const settled = market.status === 'SETTLED' || event.status === 'SETTLED';
  const columns = market.selections.length <= 3 ? market.selections.length : 2;

  return (
    <section
      className="rounded-lg border border-border bg-card"
      aria-labelledby={`market-${market.id}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h3 id={`market-${market.id}`} className="text-sm font-semibold">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {market.status === 'SUSPENDED' ? (
            <Lock className="h-3.5 w-3.5 text-warning" aria-hidden />
          ) : null}
          <MarketStatusBadge status={market.status} />
        </div>
      </header>
      <div
        className={cn('grid gap-2 p-3')}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {market.selections.map((selection) =>
          settled ? (
            <div
              key={selection.id}
              className={cn(
                'flex h-11 items-center justify-between rounded-md border border-border bg-surface px-3 text-sm',
                selection.result === 'WON' && 'border-success/50',
              )}
            >
              <span className="truncate text-muted-foreground">{selection.name}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums font-semibold">
                  {formatPrice(selection.priceMilli)}
                </span>
                {selection.result ? (
                  <Badge variant={RESULT_VARIANT[selection.result]}>{selection.result}</Badge>
                ) : null}
              </span>
            </div>
          ) : (
            <OddsButton key={selection.id} event={event} market={market} selection={selection} />
          ),
        )}
      </div>
    </section>
  );
}
