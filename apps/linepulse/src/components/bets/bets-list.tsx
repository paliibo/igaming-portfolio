'use client';
import { Receipt } from 'lucide-react';
import { useBetSettled } from '@igaming/api-client';
import { Button, EmptyState, ErrorState } from '@igaming/ui';
import { useBets, type BetsStatusFilter } from '@/lib/sportsbook';
import { BetRow, BetRowSkeleton } from './bet-row';
import { LinkButton } from '@/components/ui/link-button';

export function BetsList({ status }: { status: BetsStatusFilter }) {
  const bets = useBets(status);
  useBetSettled(() => void bets.refetch());

  if (bets.isLoading) {
    return (
      <ul className="space-y-3" aria-busy>
        {Array.from({ length: 3 }, (_, i) => (
          <BetRowSkeleton key={i} />
        ))}
      </ul>
    );
  }
  if (bets.isError)
    return (
      <ErrorState
        title="Could not load bets"
        message={bets.error.message}
        onRetry={() => void bets.refetch()}
      />
    );

  const items = bets.data?.pages.flatMap((p) => p.items) ?? [];
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title={status === 'open' ? 'No open bets' : 'No settled bets yet'}
        description={
          status === 'open'
            ? 'Bets you place will wait here until the event is settled.'
            : 'Once your open bets are settled, they move here with the final result.'
        }
        action={
          <LinkButton variant="outline" size="sm" href="/sports">
            Find an event
          </LinkButton>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3" aria-live="polite">
        {items.map((bet) => (
          <BetRow key={bet.id} bet={bet} />
        ))}
      </ul>
      {bets.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void bets.fetchNextPage()}
            loading={bets.isFetchingNextPage}
          >
            Load more
          </Button>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          {items.length} bet{items.length === 1 ? '' : 's'} shown
        </p>
      )}
    </div>
  );
}
