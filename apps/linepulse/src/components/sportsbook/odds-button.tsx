'use client';
import { ArrowDown, ArrowUp, Lock } from 'lucide-react';
import type { MarketDto, SelectionDto, SportsEventDto } from '@igaming/contracts';
import { cn } from '@igaming/ui';
import { useBetslipStore, useIsSelected } from '@/lib/betslip-store';
import { useFlash } from '@/lib/flash-store';
import { formatPrice } from '@/lib/format';
import { eventName } from '@/lib/sportsbook';

interface OddsButtonProps {
  event: Pick<SportsEventDto, 'id' | 'homeTeam' | 'awayTeam' | 'status'>;
  market: Pick<MarketDto, 'id' | 'name' | 'status' | 'line'>;
  selection: SelectionDto;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function isBettable(
  eventStatus: SportsEventDto['status'],
  marketStatus: MarketDto['status'],
) {
  return marketStatus === 'OPEN' && (eventStatus === 'SCHEDULED' || eventStatus === 'LIVE');
}

export function OddsButton({
  event,
  market,
  selection,
  label,
  size = 'md',
  className,
}: OddsButtonProps) {
  const selected = useIsSelected(selection.id);
  const toggle = useBetslipStore((s) => s.toggle);
  const flash = useFlash(selection.id);
  const bettable = isBettable(event.status, market.status);
  const suspended = market.status === 'SUSPENDED';
  const marketLabel = market.line ? `${market.name} ${market.line}` : market.name;

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({
      selectionId: selection.id,
      marketId: market.id,
      eventId: event.id,
      eventName: eventName(event),
      marketName: marketLabel,
      selectionName: selection.name,
      priceMilli: selection.priceMilli,
    });
  };

  return (
    <button
      type="button"
      data-testid="odds-button"
      data-selection-id={selection.id}
      aria-pressed={selected}
      aria-label={`${label ?? selection.name} at ${formatPrice(selection.priceMilli)}${bettable ? '' : suspended ? ', suspended' : ', unavailable'}`}
      disabled={!bettable}
      onClick={onClick}
      className={cn(
        'group relative flex min-w-0 items-center justify-between gap-1 rounded-md border text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed',
        size === 'sm' ? 'h-9 px-2 text-xs' : 'h-11 px-3 text-sm',
        selected
          ? 'border-brand bg-primary text-primary-foreground'
          : 'border-border bg-surface-raised hover:border-brand/60 hover:bg-accent',
        !bettable && 'opacity-60 hover:border-border hover:bg-surface-raised',
        flash?.direction === 'up' && 'animate-price-up',
        flash?.direction === 'down' && 'animate-price-down',
        className,
      )}
    >
      <span
        className={cn(
          'truncate',
          selected ? 'text-primary-foreground/80' : 'text-muted-foreground',
        )}
      >
        {label ?? selection.name}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 font-semibold tabular-nums">
        {!bettable ? (
          <Lock className="h-3.5 w-3.5" aria-hidden />
        ) : flash?.direction === 'up' ? (
          <ArrowUp className="h-3.5 w-3.5 text-success" aria-hidden />
        ) : flash?.direction === 'down' ? (
          <ArrowDown className="h-3.5 w-3.5 text-destructive" aria-hidden />
        ) : null}
        {formatPrice(selection.priceMilli)}
      </span>
    </button>
  );
}
