'use client';
import * as React from 'react';
import { PageHeader } from '@igaming/ui';
import { useOperatorGames } from '@/lib/api/admin';
import { useUrlFilters } from '@/lib/use-url-filters';
import { dayEndIso, dayStartIso } from '@/lib/format';
import {
  DateRangeFilter,
  DebouncedInput,
  FilterBar,
  FilterField,
  FilterSelect,
} from '@/components/common/filter-bar';
import { PlayerPicker } from '@/components/common/player-picker';
import { RoundsTable } from '@/components/tables/rounds-table';

const FILTER_KEYS = ['playerId', 'gameId', 'from', 'to'] as const;

export default function RoundsPage() {
  const filters = useUrlFilters(FILTER_KEYS);
  const { playerId, gameId, from, to } = filters.values;
  const games = useOperatorGames();
  const setGameId = React.useCallback(
    (value: string) => filters.set('gameId', value.trim()),
    [filters],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Casino rounds"
        description="Dice and slots rounds played on SpinHarbor, with stake, payout and the provably recorded outcome."
      />
      <FilterBar onReset={filters.reset} isDirty={filters.isDirty}>
        <FilterField label="Player" htmlFor="rounds-player" className="basis-64">
          <PlayerPicker
            id="rounds-player"
            value={playerId}
            onChange={(id) => filters.set('playerId', id)}
          />
        </FilterField>
        <FilterField label="Game" htmlFor="rounds-game" className="basis-52">
          {games.data && games.data.length > 0 ? (
            <FilterSelect
              id="rounds-game"
              value={gameId}
              onValueChange={(v) => filters.set('gameId', v)}
              allLabel="All games"
              options={games.data.map((game) => ({ value: game.id, label: game.name }))}
            />
          ) : (
            <DebouncedInput
              id="rounds-game"
              placeholder={games.isPending ? 'Loading games…' : 'Game id'}
              value={gameId}
              onValueChange={setGameId}
              className="font-mono"
              disabled={games.isPending}
            />
          )}
        </FilterField>
        <DateRangeFilter
          idPrefix="rounds"
          from={from}
          to={to}
          onChange={(patch) => filters.setMany(patch)}
        />
      </FilterBar>
      {games.isError ? (
        <p className="text-xs text-muted-foreground">
          The game catalogue could not be loaded, so the game filter accepts a game id instead.
        </p>
      ) : null}
      <RoundsTable
        filters={{
          playerId: playerId || undefined,
          gameId: gameId || undefined,
          from: dayStartIso(from),
          to: dayEndIso(to),
        }}
      />
    </div>
  );
}
