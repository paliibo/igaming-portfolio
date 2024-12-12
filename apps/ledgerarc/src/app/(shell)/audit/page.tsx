'use client';
import * as React from 'react';
import { PageHeader } from '@igaming/ui';
import { useUrlFilters } from '@/lib/use-url-filters';
import { dayEndIso, dayStartIso, isUuid } from '@/lib/format';
import {
  DateRangeFilter,
  DebouncedInput,
  FilterBar,
  FilterField,
} from '@/components/common/filter-bar';
import { AuditTable } from '@/components/tables/audit-table';

const FILTER_KEYS = ['action', 'actorId', 'targetId', 'from', 'to'] as const;

export default function AuditPage() {
  const filters = useUrlFilters(FILTER_KEYS);
  const { action, actorId, targetId, from, to } = filters.values;
  const setAction = React.useCallback(
    (value: string) => filters.set('action', value.trim()),
    [filters],
  );
  const setActor = React.useCallback(
    (value: string) => filters.set('actorId', value.trim()),
    [filters],
  );
  const setTarget = React.useCallback(
    (value: string) => filters.set('targetId', value.trim()),
    [filters],
  );
  const actorInvalid = actorId !== '' && !isUuid(actorId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit logs"
        description="Every staff action recorded by the API: who did what, to which record, from where. Open a row for the full metadata."
      />
      <FilterBar onReset={filters.reset} isDirty={filters.isDirty}>
        <FilterField label="Action prefix" htmlFor="audit-action" className="basis-52">
          <DebouncedInput
            id="audit-action"
            placeholder="player., wallet.adjust, journal."
            value={action}
            onValueChange={setAction}
            className="font-mono"
          />
        </FilterField>
        <FilterField label="Actor id" htmlFor="audit-actor" className="basis-64">
          <DebouncedInput
            id="audit-actor"
            placeholder="Staff user id"
            value={actorId}
            onValueChange={setActor}
            className="font-mono"
            aria-invalid={actorInvalid}
            aria-describedby={actorInvalid ? 'audit-actor-error' : undefined}
          />
        </FilterField>
        <FilterField label="Target id" htmlFor="audit-target" className="basis-64">
          <DebouncedInput
            id="audit-target"
            placeholder="Player, entry or alert id"
            value={targetId}
            onValueChange={setTarget}
            className="font-mono"
          />
        </FilterField>
        <DateRangeFilter
          idPrefix="audit"
          from={from}
          to={to}
          onChange={(patch) => filters.setMany(patch)}
        />
      </FilterBar>
      {actorInvalid ? (
        <p id="audit-actor-error" className="text-xs text-destructive">
          Actor id must be a full UUID; copy it from an audit event or the user menu.
        </p>
      ) : null}
      <AuditTable
        filters={{
          action: action || undefined,
          actorId: actorInvalid ? undefined : actorId || undefined,
          targetId: targetId || undefined,
          from: dayStartIso(from),
          to: dayEndIso(to),
        }}
      />
    </div>
  );
}
