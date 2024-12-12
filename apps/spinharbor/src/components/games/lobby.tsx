'use client';
import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { CasinoGameDto, GameCategory } from '@igaming/contracts';
import {
  Button,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@igaming/ui';
import { useGames } from '@/lib/casino-api';
import { CATEGORY_META, categoryFromSlug } from '@/lib/game-meta';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { CategoryChips } from './category-chips';
import { GameGrid } from './game-grid';

type SortKey = 'featured' | 'name' | 'popular' | 'stake';

const SORT_LABEL: Record<SortKey, string> = {
  featured: 'Featured first',
  name: 'Name A–Z',
  popular: 'Most played',
  stake: 'Lowest stake',
};

function sortGames(games: CasinoGameDto[], sort: SortKey): CasinoGameDto[] {
  const copy = [...games];
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'popular':
      return copy.sort(
        (a, b) => (b.roundCount ?? 0) - (a.roundCount ?? 0) || a.name.localeCompare(b.name),
      );
    case 'stake':
      return copy.sort(
        (a, b) =>
          Number(BigInt(a.minStakeMinor) - BigInt(b.minStakeMinor)) || a.name.localeCompare(b.name),
      );
    default:
      return copy.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || Number(b.playable) - Number(a.playable),
      );
  }
}

export function Lobby() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const categoryParam = params.get('category');
  const category = categoryParam ? categoryFromSlug(categoryParam) : null;
  const urlQuery = params.get('q') ?? '';
  const [search, setSearch] = React.useState(urlQuery);
  const [sort, setSort] = React.useState<SortKey>('featured');
  const debounced = useDebouncedValue(search.trim(), 300);

  React.useEffect(() => {
    if (debounced === urlQuery) return;
    const next = new URLSearchParams(params.toString());
    if (debounced) next.set('q', debounced);
    else next.delete('q');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debounced, urlQuery, params, pathname, router]);

  const games = useGames({ category: category ?? undefined, search: debounced || undefined });
  const all = useGames();
  const counts = React.useMemo(() => {
    const result: Partial<Record<GameCategory, number>> = {};
    for (const game of all.data ?? []) result[game.category] = (result[game.category] ?? 0) + 1;
    return result;
  }, [all.data]);

  const hrefFor = (next: GameCategory | null) => {
    const sp = new URLSearchParams();
    if (next) sp.set('category', CATEGORY_META[next].slug);
    if (debounced) sp.set('q', debounced);
    const qs = sp.toString();
    return qs ? `/lobby?${qs}` : '/lobby';
  };

  const sorted = games.data ? sortGames(games.data, sort) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lobby"
        description={
          category
            ? CATEGORY_META[category].blurb
            : 'Every title in the SpinHarbor catalogue. Featured games float to the top.'
        }
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="lobby-search">Search games</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="lobby-search"
              type="search"
              placeholder="Harbor, dice, jackpot…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 pr-9"
              autoComplete="off"
            />
            {search ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                aria-label="Clear search"
                onClick={() => setSearch('')}
              >
                <X />
              </Button>
            ) : null}
          </div>
        </div>
        <div className="w-full space-y-1.5 md:w-52">
          <Label htmlFor="lobby-sort">Sort</Label>
          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger id="lobby-sort" aria-label="Sort games">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <CategoryChips active={category} hrefFor={hrefFor} counts={counts} />
      <p className="text-sm text-muted-foreground" role="status">
        {games.data
          ? `${games.data.length} ${games.data.length === 1 ? 'game' : 'games'}${debounced ? ` matching “${debounced}”` : ''}`
          : 'Loading catalogue…'}
      </p>
      <GameGrid
        games={sorted}
        isLoading={games.isLoading}
        error={games.error}
        onRetry={() => void games.refetch()}
        emptyTitle={debounced ? `Nothing matches “${debounced}”` : 'No games in this category'}
        emptyAction={
          debounced ? (
            <Button variant="outline" size="sm" onClick={() => setSearch('')}>
              Clear search
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
