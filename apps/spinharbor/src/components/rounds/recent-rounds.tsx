'use client';
import * as React from 'react';
import { ArrowRight, Dice5 } from 'lucide-react';
import type { GameRoundDto } from '@igaming/contracts';
import { EmptyState, ErrorState, Skeleton, cn } from '@igaming/ui';
import { formatCredits, formatRelative } from '@/lib/format';
import { RoundDetailsDialog } from './round-details-dialog';
import { NetAmount, RoundOutcomeSummary } from './round-summary';
import { LinkButton } from '@/components/ui/link-button';

interface RecentRoundsListProps {
  rounds: GameRoundDto[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  showGame?: boolean;
  emptyDescription?: string;
  className?: string;
}

export function RecentRoundsList({
  rounds,
  isLoading,
  error,
  onRetry,
  showGame = true,
  emptyDescription = 'Rounds you play will show up here.',
  className,
}: RecentRoundsListProps) {
  const [selected, setSelected] = React.useState<GameRoundDto | null>(null);

  if (error)
    return (
      <ErrorState title="Could not load recent rounds" message={error.message} onRetry={onRetry} />
    );
  if (isLoading || !rounds) {
    return (
      <ul className={cn('space-y-2', className)} aria-busy="true">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i}>
            <Skeleton className="h-14" />
          </li>
        ))}
      </ul>
    );
  }
  if (rounds.length === 0) {
    return (
      <EmptyState
        icon={Dice5}
        title="No rounds yet"
        description={emptyDescription}
        action={
          <LinkButton variant="outline" size="sm" href="/play/harbor-dice">
            Roll the dice
          </LinkButton>
        }
      />
    );
  }
  return (
    <>
      <ul
        className={cn('divide-y divide-border rounded-lg border border-border bg-card', className)}
      >
        {rounds.map((round) => (
          <li key={round.id}>
            <button
              type="button"
              onClick={() => setSelected(round)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              aria-label={`Open details for ${round.gameName} round ${round.roundNumber}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  {showGame ? (
                    <span className="truncate text-sm font-medium">{round.gameName}</span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">#{round.roundNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    · {formatRelative(round.createdAt)}
                  </span>
                </div>
                <RoundOutcomeSummary round={round} className="text-xs" />
              </div>
              <div className="text-right">
                <NetAmount netMinor={round.netMinor} className="block text-sm" />
                <span className="text-xs text-muted-foreground tabular-nums">
                  stake {formatCredits(round.stakeMinor)}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <RoundDetailsDialog
        round={selected}
        open={selected !== null}
        onOpenChange={(open) => (open ? undefined : setSelected(null))}
      />
    </>
  );
}
