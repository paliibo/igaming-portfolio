'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { SportsEventDto } from '@igaming/contracts';
import { cn } from '@igaming/ui';
import { primaryMarket } from '@/lib/sportsbook';
import { EventTimeLabel } from './event-status';
import { OddsButton } from './odds-button';
import { SportIcon } from './sport-icon';

const OUTCOME_LABEL: Record<string, string> = { HOME: '1', DRAW: 'X', AWAY: '2' };

export function outcomeLabel(outcomeKey: string, fallback: string) {
  return OUTCOME_LABEL[outcomeKey] ?? fallback;
}

export function EventRow({
  event,
  showSport = true,
  className,
}: {
  event: SportsEventDto;
  showSport?: boolean;
  className?: string;
}) {
  const market = primaryMarket(event);
  const showScore = event.status !== 'SCHEDULED';
  const extraMarkets = Math.max(event.markets.length - 1, 0);

  return (
    <article
      className={cn(
        'group relative grid grid-cols-1 gap-3 border-b border-border px-3 py-3 transition-colors last:border-b-0 hover:bg-accent/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4',
        className,
      )}
    >
      <Link
        href={`/events/${event.id}`}
        data-testid="event-card"
        className="min-w-0 rounded-md focus-visible:outline-2 focus-visible:outline-ring after:absolute after:inset-0 after:content-['']"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {showSport ? (
            <span className="inline-flex items-center gap-1">
              <SportIcon slug={event.sport.slug} className="h-3.5 w-3.5" />
              {event.sport.name}
            </span>
          ) : null}
          <span className="truncate">{event.competition}</span>
        </div>
        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
          <div className="min-w-0 space-y-0.5 text-sm font-medium">
            <p className="truncate">{event.homeTeam}</p>
            <p className="truncate">{event.awayTeam}</p>
          </div>
          {showScore ? (
            <div className="space-y-0.5 text-right text-sm font-semibold tabular-nums">
              <p>{event.homeScore}</p>
              <p>{event.awayScore}</p>
            </div>
          ) : null}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <EventTimeLabel
            status={event.status}
            startsAt={event.startsAt}
            clockMinute={event.clockMinute}
            periodLabel={event.periodLabel}
          />
          {extraMarkets > 0 ? (
            <span className="inline-flex items-center text-xs text-brand">
              +{extraMarkets} market{extraMarkets === 1 ? '' : 's'}
              <ChevronRight className="h-3 w-3" aria-hidden />
            </span>
          ) : null}
        </div>
      </Link>
      {market ? (
        <div
          className="relative z-10 grid gap-1.5 sm:w-[228px]"
          style={{ gridTemplateColumns: `repeat(${market.selections.length}, minmax(0, 1fr))` }}
          aria-label={market.name}
        >
          {market.selections.map((selection) => (
            <OddsButton
              key={selection.id}
              event={event}
              market={market}
              selection={selection}
              label={outcomeLabel(selection.outcomeKey, selection.name)}
              size="sm"
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No markets</p>
      )}
    </article>
  );
}

export function EventRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_228px]">
      <div className="space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="h-9 animate-pulse rounded-md bg-muted" />
        <div className="h-9 animate-pulse rounded-md bg-muted" />
        <div className="h-9 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
