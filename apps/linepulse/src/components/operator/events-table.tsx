'use client';
import * as React from 'react';
import { CalendarX, Settings2 } from 'lucide-react';
import type { SportsEventDto, SportsEventStatus } from '@igaming/contracts';
import {
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@igaming/ui';
import { EventStatusBadge } from '@/components/sportsbook/event-status';
import { SportIcon } from '@/components/sportsbook/sport-icon';
import { formatDateTime } from '@/lib/format';
import { useOperatorEvents } from '@/lib/operator';
import { ManageEventDialog } from './manage-event-dialog';

type Filter = 'active' | 'settled' | 'all';
const ACTIVE: SportsEventStatus[] = ['SCHEDULED', 'LIVE', 'FINISHED'];

export function OperatorEventsTable() {
  const events = useOperatorEvents(true);
  const [filter, setFilter] = React.useState<Filter>('active');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  if (events.isLoading) {
    return (
      <div className="space-y-2" aria-busy>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }
  if (events.isError)
    return (
      <ErrorState
        title="Could not load events"
        message={events.error.message}
        onRetry={() => void events.refetch()}
      />
    );

  const all = events.data ?? [];
  const rows = all.filter((e) =>
    filter === 'all'
      ? true
      : filter === 'active'
        ? ACTIVE.includes(e.status)
        : !ACTIVE.includes(e.status),
  );
  const selected = all.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList aria-label="Event filter">
          <TabsTrigger value="active">
            Active ({all.filter((e) => ACTIVE.includes(e.status)).length})
          </TabsTrigger>
          <TabsTrigger value="settled">
            Settled &amp; cancelled ({all.filter((e) => !ACTIVE.includes(e.status)).length})
          </TabsTrigger>
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No events in this view"
          description="Create a fixture to start taking bets."
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="hidden md:table-cell">Starts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Markets</TableHead>
                <TableHead className="text-right">Bets</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((event) => (
                <OperatorRow
                  key={event.id}
                  event={event}
                  onManage={() => setSelectedId(event.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ManageEventDialog event={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function OperatorRow({ event, onManage }: { event: SportsEventDto; onManage: () => void }) {
  const openMarkets = event.markets.filter((m) => m.status === 'OPEN').length;
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <SportIcon slug={event.sport.slug} className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {event.homeTeam} vs {event.awayTeam}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {event.competition}
              <span className="md:hidden"> · {formatDateTime(event.startsAt)}</span>
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden whitespace-nowrap tabular-nums text-muted-foreground md:table-cell">
        {formatDateTime(event.startsAt)}
      </TableCell>
      <TableCell>
        <EventStatusBadge status={event.status} />
      </TableCell>
      <TableCell className="text-center tabular-nums">
        {event.status === 'SCHEDULED' ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          `${event.homeScore}:${event.awayScore}`
        )}
        {event.status === 'LIVE' ? (
          <span className="ml-1 text-xs text-muted-foreground">{event.clockMinute}&apos;</span>
        ) : null}
      </TableCell>
      <TableCell className="hidden text-right tabular-nums sm:table-cell">
        {openMarkets}/{event.markets.length}
      </TableCell>
      <TableCell className="text-right tabular-nums">{event.betCount ?? 0}</TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="outline"
          onClick={onManage}
          aria-label={`Manage ${event.homeTeam} vs ${event.awayTeam}`}
        >
          <Settings2 aria-hidden /> Manage
        </Button>
      </TableCell>
    </TableRow>
  );
}
