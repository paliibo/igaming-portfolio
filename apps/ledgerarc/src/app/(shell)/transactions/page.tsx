'use client';
import * as React from 'react';
import { JOURNAL_KINDS } from '@igaming/contracts';
import { PageHeader } from '@igaming/ui';
import { useUrlFilters } from '@/lib/use-url-filters';
import { dayEndIso, dayStartIso } from '@/lib/format';
import { JOURNAL_KIND_LABEL } from '@/lib/labels';
import {
  DateRangeFilter,
  DebouncedInput,
  FilterBar,
  FilterField,
  FilterSelect,
} from '@/components/common/filter-bar';
import { PlayerPicker } from '@/components/common/player-picker';
import { TransactionsTable } from '@/components/tables/transactions-table';

const FILTER_KEYS = ['playerId', 'kind', 'referenceId', 'from', 'to'] as const;

export default function TransactionsPage() {
  const filters = useUrlFilters(FILTER_KEYS);
  const { playerId, kind, referenceId, from, to } = filters.values;
  const setReference = React.useCallback(
    (value: string) => filters.set('referenceId', value),
    [filters],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Transactions"
        description="Every wallet movement across all players. Open a row to inspect the balanced journal entry behind it."
      />
      <FilterBar onReset={filters.reset} isDirty={filters.isDirty}>
        <FilterField label="Player" htmlFor="tx-player" className="basis-64">
          <PlayerPicker
            id="tx-player"
            value={playerId}
            onChange={(id) => filters.set('playerId', id)}
          />
        </FilterField>
        <FilterField label="Kind" htmlFor="tx-kind">
          <FilterSelect
            id="tx-kind"
            value={kind}
            onValueChange={(v) => filters.set('kind', v)}
            allLabel="All kinds"
            options={JOURNAL_KINDS.map((k) => ({ value: k, label: JOURNAL_KIND_LABEL[k] }))}
          />
        </FilterField>
        <FilterField label="Reference id" htmlFor="tx-reference" className="basis-56">
          <DebouncedInput
            id="tx-reference"
            placeholder="Bet, round or adjustment id"
            value={referenceId}
            onValueChange={setReference}
            className="font-mono"
          />
        </FilterField>
        <DateRangeFilter
          idPrefix="tx"
          from={from}
          to={to}
          onChange={(patch) => filters.setMany(patch)}
        />
      </FilterBar>
      <TransactionsTable
        filters={{
          playerId: playerId || undefined,
          kind: kind || undefined,
          referenceId: referenceId || undefined,
          from: dayStartIso(from),
          to: dayEndIso(to),
        }}
      />
    </div>
  );
}
