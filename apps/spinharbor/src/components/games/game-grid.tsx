import type { LucideIcon } from 'lucide-react';
import { Gamepad2 } from 'lucide-react';
import type { CasinoGameDto } from '@igaming/contracts';
import { EmptyState, ErrorState, cn } from '@igaming/ui';
import { GameTile, GameTileSkeleton } from './game-tile';

interface GameGridProps {
  games: CasinoGameDto[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;
  className?: string;
  skeletonCount?: number;
}

export function GameGrid({
  games,
  isLoading,
  error,
  onRetry,
  emptyTitle = 'No games match',
  emptyDescription = 'Try a different category or clear the search.',
  emptyIcon = Gamepad2,
  emptyAction,
  className,
  skeletonCount = 8,
}: GameGridProps) {
  if (error)
    return (
      <ErrorState title="Could not load the catalogue" message={error.message} onRetry={onRetry} />
    );
  if (isLoading || !games) {
    return (
      <div
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          className,
        )}
        aria-busy="true"
      >
        {Array.from({ length: skeletonCount }, (_, i) => (
          <GameTileSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (games.length === 0)
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {games.map((game) => (
        <GameTile key={game.id} game={game} />
      ))}
    </div>
  );
}
