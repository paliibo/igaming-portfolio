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
import { JournalEntryDrawer } from '@/components/journal/journal-entry-drawer';
import { JournalTable } from '@/components/tables/journal-table';

const FILTER_KEYS = ['kind', 'referenceId', 'playerId', 'from', 'to', 'entry'] as const;

export default function JournalPage() {
  const filters = useUrlFilters(FILTER_KEYS);
  const { kind, referenceId, playerId, from, to, entry } = filters.values;
  const setReference = React.useCallback(
    (value: string) => filters.set('referenceId', value.trim()),
    [filters],
  );
  const selectEntry = React.useCallback((id: string) => filters.set('entry', id), [filters]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ledger journal"
        description="Double-entry postings behind every wallet movement. Expand an entry to see its debit and credit lines; each one is checked to balance in the browser."
      />
      <FilterBar onReset={filters.reset} isDirty={filters.isDirty}>
        <FilterField label="Kind" htmlFor="journal-kind">
          <FilterSelect
            id="journal-kind"
            value={kind}
            onValueChange={(v) => filters.set('kind', v)}
            allLabel="All kinds"
            options={JOURNAL_KINDS.map((k) => ({ value: k, label: JOURNAL_KIND_LABEL[k] }))}
          />
        </FilterField>
        <FilterField label="Reference id" htmlFor="journal-reference" className="basis-56">
          <DebouncedInput
            id="journal-reference"
            placeholder="Bet, round or adjustment id"
            value={referenceId}
            onValueChange={setReference}
            className="font-mono"
          />
        </FilterField>
        <FilterField label="Player" htmlFor="journal-player" className="basis-64">
          <PlayerPicker
            id="journal-player"
            value={playerId}
            onChange={(id) => filters.set('playerId', id)}
          />
        </FilterField>
        <DateRangeFilter
          idPrefix="journal"
          from={from}
          to={to}
          onChange={(patch) => filters.setMany(patch)}
        />
      </FilterBar>
      <JournalTable
        filters={{
          kind: kind || undefined,
          referenceId: referenceId || undefined,
          playerId: playerId || undefined,
          from: dayStartIso(from),
          to: dayEndIso(to),
        }}
        onSelectEntry={selectEntry}
      />
      <JournalEntryDrawer
        entryId={entry || null}
        onOpenChange={(open) => !open && filters.set('entry', undefined)}
        onSelectEntry={selectEntry}
      />
    </div>
  );
}
