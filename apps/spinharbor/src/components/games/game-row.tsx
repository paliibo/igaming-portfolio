import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CasinoGameDto } from '@igaming/contracts';
import { GameTile, GameTileSkeleton } from './game-tile';

interface GameRowProps {
  id: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  games: CasinoGameDto[] | undefined;
  isLoading?: boolean;
}

export function GameRow({
  id,
  title,
  description,
  href,
  hrefLabel = 'View all',
  games,
  isLoading = false,
}: GameRowProps) {
  if (!isLoading && games && games.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id={`${id}-heading`} className="text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {hrefLabel} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="scroll-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:px-0">
        {isLoading || !games
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="w-[16.5rem] shrink-0">
                <GameTileSkeleton />
              </div>
            ))
          : games.map((game) => (
              <div key={game.id} className="w-[16.5rem] shrink-0">
                <GameTile game={game} />
              </div>
            ))}
      </div>
    </section>
  );
}
