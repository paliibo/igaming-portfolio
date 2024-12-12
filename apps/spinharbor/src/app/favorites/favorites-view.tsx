'use client';
import { Heart } from 'lucide-react';
import { PageHeader } from '@igaming/ui';
import { useFavorites } from '@/lib/casino-api';
import { GameGrid } from '@/components/games/game-grid';
import { RequireAuth } from '@/components/shell/require-auth';
import { LinkButton } from '@/components/ui/link-button';

function FavoritesGrid() {
  const favorites = useFavorites(true);
  return (
    <GameGrid
      games={favorites.data}
      isLoading={favorites.isLoading}
      error={favorites.error}
      onRetry={() => void favorites.refetch()}
      emptyIcon={Heart}
      emptyTitle="No favourites yet"
      emptyDescription="Tap the heart on any game tile to keep it here for quick access."
      emptyAction={<LinkButton href="/lobby">Browse the lobby</LinkButton>}
      skeletonCount={4}
    />
  );
}

export function FavoritesView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Favourites"
        description="Games you have hearted. Favourites sync with your account across the platform."
      />
      <RequireAuth>
        <FavoritesGrid />
      </RequireAuth>
    </div>
  );
}
