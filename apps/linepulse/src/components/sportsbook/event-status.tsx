import type { MarketStatus, SportsEventStatus } from '@igaming/contracts';
import { Badge, cn } from '@igaming/ui';
import { formatClock, formatKickoff } from '@/lib/format';

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)} aria-hidden>
      <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-70 animate-pulse-dot" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
    </span>
  );
}

export function LiveBadge({
  clockMinute,
  periodLabel,
  className,
}: {
  clockMinute: number;
  periodLabel: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md bg-destructive/15 px-1.5 py-0.5 text-[11px] font-semibold text-destructive',
        className,
      )}
    >
      <LiveDot />
      LIVE
      <span className="tabular-nums font-medium text-foreground/80">
        {formatClock(clockMinute, periodLabel)}
      </span>
    </span>
  );
}

const EVENT_STATUS_VARIANT: Record<
  SportsEventStatus,
  'brand' | 'destructive' | 'muted' | 'success' | 'warning'
> = {
  SCHEDULED: 'brand',
  LIVE: 'destructive',
  FINISHED: 'warning',
  SETTLED: 'success',
  CANCELLED: 'muted',
};

export function EventStatusBadge({
  status,
  className,
}: {
  status: SportsEventStatus;
  className?: string;
}) {
  return (
    <Badge variant={EVENT_STATUS_VARIANT[status]} className={className}>
      {status === 'LIVE' ? <LiveDot /> : null}
      {status}
    </Badge>
  );
}

const MARKET_STATUS_VARIANT: Record<MarketStatus, 'success' | 'warning' | 'muted' | 'brand'> = {
  OPEN: 'success',
  SUSPENDED: 'warning',
  CLOSED: 'muted',
  SETTLED: 'brand',
};

export function MarketStatusBadge({
  status,
  className,
}: {
  status: MarketStatus;
  className?: string;
}) {
  return (
    <Badge variant={MARKET_STATUS_VARIANT[status]} className={className}>
      {status}
    </Badge>
  );
}

/** Kick-off time for scheduled events, live clock for in-play, final label otherwise. */
export function EventTimeLabel({
  status,
  startsAt,
  clockMinute,
  periodLabel,
  className,
}: {
  status: SportsEventStatus;
  startsAt: string;
  clockMinute: number;
  periodLabel: string | null;
  className?: string;
}) {
  if (status === 'LIVE')
    return <LiveBadge clockMinute={clockMinute} periodLabel={periodLabel} className={className} />;
  if (status === 'SCHEDULED')
    return (
      <span className={cn('text-xs text-muted-foreground tabular-nums', className)}>
        {formatKickoff(startsAt)}
      </span>
    );
  return <EventStatusBadge status={status} className={className} />;
}
