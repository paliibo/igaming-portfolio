'use client';
import { CalendarClock, Radio, Receipt, Trophy } from 'lucide-react';
import { PageHeader, Skeleton, StatCard } from '@igaming/ui';
import { RequireAuth } from '@/components/auth/require-auth';
import { CreateEventDialog } from '@/components/operator/create-event-dialog';
import { OperatorEventsTable } from '@/components/operator/events-table';
import { useOperatorEvents } from '@/lib/operator';

function OperatorStats() {
  const events = useOperatorEvents(true);
  const all = events.data;
  const value = (compute: (items: NonNullable<typeof all>) => number) =>
    all ? compute(all) : <Skeleton className="h-7 w-10" />;
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Operator stats">
      <StatCard
        label="Live"
        value={value((items) => items.filter((e) => e.status === 'LIVE').length)}
        icon={Radio}
        tone="destructive"
      />
      <StatCard
        label="Scheduled"
        value={value((items) => items.filter((e) => e.status === 'SCHEDULED').length)}
        icon={CalendarClock}
      />
      <StatCard
        label="Awaiting settlement"
        value={value((items) => items.filter((e) => e.status === 'FINISHED').length)}
        icon={Trophy}
        tone="warning"
      />
      <StatCard
        label="Bets on book"
        value={value((items) => items.reduce((sum, e) => sum + (e.betCount ?? 0), 0))}
        icon={Receipt}
        tone="brand"
      />
    </section>
  );
}

export default function OperatorPage() {
  return (
    <RequireAuth roles={['OPERATOR', 'ADMIN']}>
      {() => (
        <div className="space-y-4">
          <PageHeader
            title="Operator console"
            description="Create fixtures, run the match clock, manage markets and prices, then settle or cancel."
            actions={<CreateEventDialog />}
          />
          <OperatorStats />
          <OperatorEventsTable />
        </div>
      )}
    </RequireAuth>
  );
}
