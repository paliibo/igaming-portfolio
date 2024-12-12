'use client';
import { BET_STATUSES } from '@igaming/contracts';
import { PageHeader } from '@igaming/ui';
import { useUrlFilters } from '@/lib/use-url-filters';
import { dayEndIso, dayStartIso, humanize } from '@/lib/format';
import {
  DateRangeFilter,
  FilterBar,
  FilterField,
  FilterSelect,
} from '@/components/common/filter-bar';
import { PlayerPicker } from '@/components/common/player-picker';
import { BetsTable } from '@/components/tables/bets-table';

const FILTER_KEYS = ['playerId', 'status', 'from', 'to'] as const;

export default function BetsPage() {
  const filters = useUrlFilters(FILTER_KEYS);
  const { playerId, status, from, to } = filters.values;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sports bets"
        description="Singles and accumulators placed on LinePulse, with stake, odds and settlement outcome."
      />
      <FilterBar onReset={filters.reset} isDirty={filters.isDirty}>
        <FilterField label="Player" htmlFor="bets-player" className="basis-64">
          <PlayerPicker
            id="bets-player"
            value={playerId}
            onChange={(id) => filters.set('playerId', id)}
          />
        </FilterField>
        <FilterField label="Status" htmlFor="bets-status">
          <FilterSelect
            id="bets-status"
            value={status}
            onValueChange={(v) => filters.set('status', v)}
            allLabel="All statuses"
            options={BET_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
          />
        </FilterField>
        <DateRangeFilter
          idPrefix="bets"
          from={from}
          to={to}
          onChange={(patch) => filters.setMany(patch)}
        />
      </FilterBar>
      <BetsTable
        filters={{
          playerId: playerId || undefined,
          status: status || undefined,
          from: dayStartIso(from),
          to: dayEndIso(to),
        }}
      />
    </div>
  );
}
