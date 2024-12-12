'use client';
import { useParams } from 'next/navigation';
import { SearchX } from 'lucide-react';
import { ApiError, useEventRoom } from '@igaming/api-client';
import { EmptyState, ErrorState, Skeleton } from '@igaming/ui';
import { EventHeader } from '@/components/sportsbook/event-header';
import { MarketCard } from '@/components/sportsbook/market-card';
import { useEvent } from '@/lib/sportsbook';
import { LinkButton } from '@/components/ui/link-button';

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const event = useEvent(id);
  useEventRoom(id);

  if (event.isLoading) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (event.isError) {
    if (ApiError.is(event.error) && event.error.status === 404) {
      return (
        <EmptyState
          icon={SearchX}
          title="Event not found"
          description="This event may have been removed or the link is incorrect."
          action={
            <LinkButton variant="outline" href="/sports">
              Back to sports
            </LinkButton>
          }
        />
      );
    }
    return (
      <ErrorState
        title="Could not load event"
        message={event.error.message}
        onRetry={() => void event.refetch()}
      />
    );
  }
  if (!event.data) return null;

  const data = event.data;
  const bettable = data.status === 'SCHEDULED' || data.status === 'LIVE';

  return (
    <div className="space-y-4">
      <EventHeader event={data} />
      <section aria-labelledby="markets-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="markets-heading" className="text-base font-semibold">
            Markets
          </h2>
          <p className="text-xs text-muted-foreground">
            {bettable
              ? 'Odds update live. Suspended markets reopen automatically.'
              : data.status === 'CANCELLED'
                ? 'Event cancelled. Open bets were refunded.'
                : 'Final results per selection.'}
          </p>
        </div>
        {data.markets.length === 0 ? (
          <EmptyState title="No markets" description="This event has no markets configured." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.markets.map((market) => (
              <MarketCard key={market.id} event={data} market={market} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
