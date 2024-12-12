import Link from 'next/link';
import { Play, Sparkles, Wrench } from 'lucide-react';
import type { CasinoGameDto } from '@igaming/contracts';
import { Badge, Button, Skeleton } from '@igaming/ui';
import { formatCredits } from '@/lib/format';
import { CATEGORY_META, tileState } from '@/lib/game-meta';
import { GameArtwork } from './game-artwork';
import { FavoriteButton } from './favorite-button';
import { LinkButton } from '@/components/ui/link-button';

export function GameTile({ game }: { game: CasinoGameDto }) {
  const state = tileState(game);
  const detailHref = `/games/${game.slug}`;
  return (
    <article
      data-testid="game-tile"
      className="tile-lift group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <GameArtwork artwork={game.artwork} className="aspect-[4/3] w-full">
        <div className="absolute left-3 top-3 flex gap-1.5">
          {game.featured ? <Badge variant="brand">Featured</Badge> : null}
          {state === 'maintenance' ? <Badge variant="warning">Maintenance</Badge> : null}
          {state === 'showcase' ? (
            <Badge className="border-transparent bg-black/40 text-white">Showcase</Badge>
          ) : null}
          {state === 'disabled' ? <Badge variant="destructive">Disabled</Badge> : null}
        </div>
        <FavoriteButton
          gameId={game.id}
          gameName={game.name}
          isFavorite={Boolean(game.isFavorite)}
          className="absolute right-2 top-2 z-10"
        />
      </GameArtwork>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold leading-tight">
            <Link
              href={detailHref}
              className="rounded-sm before:absolute before:inset-0 before:content-['']"
            >
              {game.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {CATEGORY_META[game.category].label} · {game.volatility} volatility
          </p>
        </div>
        <dl className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <div>
            <dt className="sr-only">Minimum stake</dt>
            <dd>
              From{' '}
              <span className="font-medium text-foreground tabular-nums">
                {formatCredits(game.minStakeMinor)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Maximum win</dt>
            <dd>
              Up to{' '}
              <span className="font-medium text-brand tabular-nums">
                {game.maxWinMultiplier.toLocaleString('en-GB')}×
              </span>
            </dd>
          </div>
        </dl>
        <div className="relative z-10">
          {state === 'play' ? (
            <LinkButton
              className="w-full"
              href={`/play/${game.slug}`}
              aria-label={`Play ${game.name}`}
            >
              <Play aria-hidden /> Play
            </LinkButton>
          ) : state === 'maintenance' ? (
            <Button className="w-full" variant="secondary" disabled>
              <Wrench aria-hidden /> Maintenance
            </Button>
          ) : state === 'disabled' ? (
            <Button className="w-full" variant="secondary" disabled>
              Disabled
            </Button>
          ) : (
            <LinkButton
              variant="outline"
              className="w-full"
              href={detailHref}
              aria-label={`View ${game.name} showcase details`}
            >
              <Sparkles aria-hidden /> Showcase
            </LinkButton>
          )}
        </div>
      </div>
    </article>
  );
}

export function GameTileSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card" aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
