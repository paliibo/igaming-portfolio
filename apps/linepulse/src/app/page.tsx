'use client';
import Link from 'next/link';
import { ArrowRight, CalendarClock, Radio, Star, Trophy } from 'lucide-react';
import { Skeleton, StatCard } from '@igaming/ui';
import { EventList } from '@/components/sportsbook/event-list';
import { SportIcon } from '@/components/sportsbook/sport-icon';
import { useEvents, useSports } from '@/lib/sportsbook';
import { LinkButton } from '@/components/ui/link-button';

export default function HomePage() {
  const live = useEvents({ status: 'live' });
  const upcoming = useEvents({ status: 'upcoming' });
  const sports = useSports();

  const scheduled = upcoming.data?.filter((e) => e.status === 'SCHEDULED') ?? [];
  const featured = scheduled.filter((e) => e.featured);
  const featuredOrNext = featured.length > 0 ? featured : scheduled.slice(0, 5);
  const liveCount = live.data?.length;
  const upcomingCount = upcoming.data ? scheduled.length : undefined;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-border bg-card">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_100%_0%,rgba(16,185,129,0.16),transparent_60%)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand">
              <Radio className="h-3.5 w-3.5" aria-hidden /> Real-time demo sportsbook
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Odds that move while you watch
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Live prices, in-play scores and instant settlement, all with virtual DMO credits.
              Nothing here is real money.
            </p>
          </div>
          <div className="flex gap-2">
            <LinkButton href="/sports?tab=live">
              Go in-play <ArrowRight aria-hidden />
            </LinkButton>
            <LinkButton variant="outline" href="/sports">
              All sports
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Quick stats">
        <StatCard
          label="Live now"
          value={liveCount ?? <Skeleton className="h-7 w-10" />}
          icon={Radio}
          tone={liveCount ? 'destructive' : 'default'}
          hint="in-play events"
        />
        <StatCard
          label="Upcoming"
          value={upcomingCount ?? <Skeleton className="h-7 w-10" />}
          icon={CalendarClock}
          hint="scheduled fixtures"
        />
        <StatCard
          label="Sports"
          value={sports.data?.length ?? <Skeleton className="h-7 w-10" />}
          icon={Trophy}
          hint="with open markets"
        />
        <StatCard
          label="Featured"
          value={upcoming.data ? featured.length : <Skeleton className="h-7 w-10" />}
          icon={Star}
          tone="brand"
          hint="spotlight events"
        />
      </section>

      <section aria-labelledby="live-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="live-heading" className="flex items-center gap-2 text-base font-semibold">
            <span className="relative inline-flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-70 animate-pulse-dot" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
            </span>
            Live now
          </h2>
          <Link href="/sports?tab=live" className="text-xs font-medium text-brand hover:underline">
            View all live
          </Link>
        </div>
        <EventList
          events={live.data}
          isLoading={live.isLoading}
          error={live.error}
          onRetry={() => void live.refetch()}
          emptyIcon={Radio}
          emptyTitle="Nothing in play right now"
          emptyDescription="Live events appear here with a running clock and score the moment they kick off."
          emptyAction={
            <LinkButton variant="outline" size="sm" href="/sports">
              Browse upcoming
            </LinkButton>
          }
        />
      </section>

      <section aria-labelledby="featured-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="featured-heading" className="flex items-center gap-2 text-base font-semibold">
            <Star className="h-4 w-4 text-brand" aria-hidden />
            {featured.length > 0 ? 'Featured upcoming' : 'Next up'}
          </h2>
          <Link href="/sports" className="text-xs font-medium text-brand hover:underline">
            All upcoming
          </Link>
        </div>
        <EventList
          events={upcoming.data ? featuredOrNext : undefined}
          isLoading={upcoming.isLoading}
          error={upcoming.error}
          onRetry={() => void upcoming.refetch()}
          emptyTitle="No upcoming fixtures"
          emptyDescription="Operators can add fixtures from the operator console."
          groupByCompetition
        />
      </section>

      <section aria-labelledby="sports-heading" className="space-y-3">
        <h2 id="sports-heading" className="text-base font-semibold">
          Browse by sport
        </h2>
        {sports.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : sports.data && sports.data.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sports.data.map((sport) => (
              <Link
                key={sport.id}
                href={`/sports/${sport.slug}`}
                className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-brand/50 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <SportIcon slug={sport.slug} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{sport.name}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {sport.eventCount} event{sport.eventCount === 1 ? '' : 's'}
                  </span>
                </span>
                <ArrowRight
                  className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
