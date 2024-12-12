'use client';
import type { GameCategory } from '@igaming/contracts';
import { PageHeader } from '@igaming/ui';
import { useGames } from '@/lib/casino-api';
import { CATEGORY_META } from '@/lib/game-meta';
import { CategoryChips } from '@/components/games/category-chips';
import { GameGrid } from '@/components/games/game-grid';
import { LinkButton } from '@/components/ui/link-button';

export function CategoryView({ category }: { category: GameCategory }) {
  const games = useGames({ category });
  const meta = CATEGORY_META[category];
  return (
    <div className="space-y-6">
      <PageHeader title={`${meta.label} games`} description={meta.blurb} />
      <CategoryChips
        active={category}
        hrefFor={(next) => (next ? `/categories/${CATEGORY_META[next].slug}` : '/lobby')}
      />
      <GameGrid
        games={games.data}
        isLoading={games.isLoading}
        error={games.error}
        onRetry={() => void games.refetch()}
        emptyTitle={`No ${meta.label.toLowerCase()} games yet`}
        emptyDescription="The operator has not published any titles in this category."
        emptyAction={
          <LinkButton variant="outline" size="sm" href="/lobby">
            Browse the lobby
          </LinkButton>
        }
      />
    </div>
  );
}
