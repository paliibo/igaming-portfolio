'use client';
import * as React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import type { CasinoGameDto } from '@igaming/contracts';
import { ApiError } from '@igaming/api-client';
import { Badge, ErrorState, Skeleton } from '@igaming/ui';
import { formatCredits } from '@/lib/format';
import { CATEGORY_META, describeError } from '@/lib/game-meta';
import { FavoriteButton } from '@/components/games/favorite-button';
import { LinkButton } from '@/components/ui/link-button';

export function PlayHeader({ game }: { game: CasinoGameDto }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <LinkButton variant="ghost" size="icon-sm" aria-label="Back to lobby" href="/lobby">
          <ArrowLeft />
        </LinkButton>
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{game.name}</h1>
          <p className="text-xs text-muted-foreground">
            {CATEGORY_META[game.category].label} · {game.volatility} volatility ·{' '}
            {formatCredits(game.minStakeMinor)} – {formatCredits(game.maxStakeMinor)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand">{game.theoreticalRtpLabel}</Badge>
        <FavoriteButton
          gameId={game.id}
          gameName={game.name}
          isFavorite={Boolean(game.isFavorite)}
          showLabel
          size="default"
          className="rounded-md"
        />
        <LinkButton variant="outline" size="sm" href={`/games/${game.slug}`}>
          <BookOpen aria-hidden /> Rules
        </LinkButton>
      </div>
    </div>
  );
}

export function SessionGate({
  error,
  opening,
  onRetry,
  children,
}: {
  error: ApiError | null;
  opening: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (error) {
    const permanent = error.code === 'GAME_NOT_PLAYABLE' || error.code === 'PLAYER_RESTRICTED';
    return (
      <div className="space-y-3">
        <ErrorState
          title="Could not open a game session"
          message={describeError(error)}
          onRetry={permanent ? undefined : onRetry}
        />
        <div className="flex justify-center">
          <LinkButton variant="outline" href="/lobby">
            Back to the lobby
          </LinkButton>
        </div>
      </div>
    );
  }
  if (opening) {
    return (
      <div
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
        aria-busy="true"
        aria-label="Opening game session"
      >
        <Skeleton className="h-[26rem]" />
        <Skeleton className="h-[26rem]" />
      </div>
    );
  }
  return <>{children}</>;
}

export function PlayScreenSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-72 max-w-full" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-[26rem]" />
        <Skeleton className="h-[26rem]" />
      </div>
    </div>
  );
}
