'use client';
import { CalendarX, type LucideIcon } from 'lucide-react';
import type { SportsEventDto } from '@igaming/contracts';
import { EmptyState, ErrorState } from '@igaming/ui';
import { EventRow, EventRowSkeleton, outcomeLabel } from './event-row';
import { primaryMarket } from '@/lib/sportsbook';

interface EventListProps {
  events: SportsEventDto[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;
  showSport?: boolean;
  groupByCompetition?: boolean;
}

export function EventList({
  events,
  isLoading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyIcon = CalendarX,
  emptyAction,
  showSport = true,
  groupByCompetition = false,
}: EventListProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {Array.from({ length: 4 }, (_, i) => (
          <EventRowSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (error)
    return <ErrorState title="Could not load events" message={error.message} onRetry={onRetry} />;
  if (!events || events.length === 0)
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );

  if (!groupByCompetition) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {events.map((event) => (
          <EventRow key={event.id} event={event} showSport={showSport} />
        ))}
      </div>
    );
  }

  const groups = new Map<string, SportsEventDto[]>();
  for (const event of events) {
    const key = `${event.sport.name} · ${event.competition}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([label, items]) => {
        const headerMarket = items[0] ? primaryMarket(items[0]) : null;
        return (
          <section key={label} className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </h3>
              {headerMarket ? (
                <div
                  className="hidden w-[228px] gap-1.5 text-center text-[11px] font-medium text-muted-foreground sm:grid"
                  style={{
                    gridTemplateColumns: `repeat(${headerMarket.selections.length}, minmax(0, 1fr))`,
                  }}
                  aria-hidden
                >
                  {headerMarket.selections.map((selection) => (
                    <span key={selection.id} className="truncate">
                      {outcomeLabel(selection.outcomeKey, selection.name)}
                    </span>
                  ))}
                </div>
              ) : null}
            </header>
            {items.map((event) => (
              <EventRow key={event.id} event={event} showSport={false} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
