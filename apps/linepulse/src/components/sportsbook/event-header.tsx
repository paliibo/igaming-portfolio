'use client';
import Link from 'next/link';
import { ChevronRight, Star } from 'lucide-react';
import type { SportsEventDto } from '@igaming/contracts';
import { Badge, cn } from '@igaming/ui';
import { formatDateTime, formatKickoff } from '@/lib/format';
import { EventStatusBadge, LiveBadge } from './event-status';
import { SportIcon } from './sport-icon';

export function EventHeader({ event }: { event: SportsEventDto }) {
  const live = event.status === 'LIVE';
  const showScore = event.status !== 'SCHEDULED';
  const openMarkets = event.markets.filter((m) => m.status === 'OPEN').length;

  return (
    <header className="relative overflow-hidden rounded-lg border border-border bg-card">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_0%_0%,rgba(16,185,129,0.14),transparent)]"
        aria-hidden
      />
      <div className="relative p-4 sm:p-5">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          <Link href="/sports" className="hover:text-foreground">
            Sports
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <Link
            href={`/sports/${event.sport.slug}`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <SportIcon slug={event.sport.slug} className="h-3.5 w-3.5" />
            {event.sport.name}
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-foreground/80">{event.competition}</span>
        </nav>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
          <TeamBlock name={event.homeTeam} side="home" />
          <div className="flex flex-col items-center gap-1.5">
            {showScore ? (
              <p
                className={cn(
                  'text-3xl font-bold tabular-nums tracking-tight sm:text-4xl',
                  live && 'text-foreground',
                )}
                aria-live="polite"
                aria-label={`Score ${event.homeScore} to ${event.awayScore}`}
              >
                {event.homeScore}
                <span className="mx-1.5 text-muted-foreground">:</span>
                {event.awayScore}
              </p>
            ) : (
              <p className="text-2xl font-semibold text-muted-foreground">vs</p>
            )}
            {live ? (
              <LiveBadge clockMinute={event.clockMinute} periodLabel={event.periodLabel} />
            ) : (
              <EventStatusBadge status={event.status} />
            )}
          </div>
          <TeamBlock name={event.awayTeam} side="away" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {event.status === 'SCHEDULED'
              ? `Kick-off ${formatKickoff(event.startsAt)}`
              : `Started ${formatDateTime(event.startsAt)}`}
          </span>
          {event.settledAt ? (
            <span className="tabular-nums">Settled {formatDateTime(event.settledAt)}</span>
          ) : null}
          <span>
            {openMarkets} of {event.markets.length} markets open
          </span>
          {event.featured ? (
            <Badge variant="brand">
              <Star className="h-3 w-3" aria-hidden /> Featured
            </Badge>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function TeamBlock({ name, side }: { name: string; side: 'home' | 'away' }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3',
        side === 'away' && 'flex-row-reverse text-right',
      )}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-xs font-bold text-brand sm:h-14 sm:w-14 sm:text-sm"
        aria-hidden
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold sm:text-lg">{name}</p>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{side}</p>
      </div>
    </div>
  );
}
