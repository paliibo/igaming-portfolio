'use client';
import * as React from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import type { JournalEntryDto } from '@igaming/contracts';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@igaming/ui';
import { useJournal } from '@/lib/api/admin';
import type { QueryFilters } from '@/lib/use-cursor-query';
import { formatDateTime } from '@/lib/format';
import { lineTotals } from '@/lib/money';
import { KindBadge } from '@/components/common/badges';
import { ListState, LoadMore, TableSkeleton } from '@/components/common/list-state';
import { Money } from '@/components/common/money';
import { PlayerLink } from '@/components/common/player-link';
import { ShortId } from '@/components/common/short-id';
import { BalancedPill, JournalLines } from '@/components/journal/journal-lines';
import { ReverseEntryButton } from '@/components/journal/journal-entry-details';

function EntryRow({
  entry,
  expanded,
  onToggle,
  onSelectEntry,
}: {
  entry: JournalEntryDto;
  expanded: boolean;
  onToggle: () => void;
  onSelectEntry: (id: string) => void;
}) {
  const totals = lineTotals(entry.lines);
  const { reversedById, reversalOfId } = entry;
  const detailsId = `journal-lines-${entry.id}`;
  return (
    <>
      <TableRow
        data-testid="journal-row"
        data-state={expanded ? 'selected' : undefined}
        className={cn(expanded && 'bg-muted/40')}
      >
        <TableCell className="w-10 pr-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={expanded ? 'Hide lines' : 'Show lines'}
          >
            {expanded ? <ChevronDown /> : <ChevronRight />}
          </Button>
        </TableCell>
        <TableCell className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(entry.createdAt)}
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap items-center gap-1">
            <KindBadge kind={entry.kind} />
            {entry.reversedById ? <Badge variant="warning">Reversed</Badge> : null}
          </div>
        </TableCell>
        <TableCell className="max-w-72">
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate" title={entry.description}>
              {entry.description}
            </span>
            <ShortId value={entry.id} label="entry id" className="-ml-1 w-fit" />
          </div>
        </TableCell>
        <TableCell>
          {entry.referenceId ? (
            <span className="flex items-center gap-1">
              {entry.referenceType ? (
                <Badge variant="outline" className="hidden xl:inline-flex">
                  {entry.referenceType}
                </Badge>
              ) : null}
              <ShortId value={entry.referenceId} label="reference" />
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="max-w-44">
          <PlayerLink player={entry.player} />
        </TableCell>
        <TableCell className="text-right">
          <Money minor={totals.debit.toString()} />
        </TableCell>
        <TableCell>
          <BalancedPill lines={entry.lines} />
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow id={detailsId} className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={8} className="p-3 sm:p-4">
            <div className="space-y-3">
              <JournalLines lines={entry.lines} compact />
              <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {entry.idempotencyKey ? (
                    <span>
                      Idempotency key <span className="font-mono">{entry.idempotencyKey}</span>
                    </span>
                  ) : null}
                  {reversedById ? (
                    <button
                      type="button"
                      onClick={() => onSelectEntry(reversedById)}
                      className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      Reversed by entry {reversedById.slice(0, 8)}
                    </button>
                  ) : null}
                  {reversalOfId ? (
                    <button
                      type="button"
                      onClick={() => onSelectEntry(reversalOfId)}
                      className="text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      Reversal of entry {reversalOfId.slice(0, 8)}
                    </button>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectEntry(entry.id)}
                  >
                    Open details
                  </Button>
                  <ReverseEntryButton entry={entry} onSelectEntry={onSelectEntry} />
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

export function JournalTable({
  filters,
  onSelectEntry,
}: {
  filters: QueryFilters;
  onSelectEntry: (id: string) => void;
}) {
  const list = useJournal(filters);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <ListState
        isPending={list.isPending}
        isError={list.isError}
        error={list.error}
        isEmpty={list.items.length === 0}
        onRetry={list.refetch}
        skeleton={<TableSkeleton columns={8} />}
        empty={{
          icon: BookOpen,
          title: 'No journal entries',
          description: 'No postings match the current filters.',
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Expand</span>
              </TableHead>
              <TableHead>Posted</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Check</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                expanded={expanded.has(entry.id)}
                onToggle={() => toggle(entry.id)}
                onSelectEntry={onSelectEntry}
              />
            ))}
          </TableBody>
        </Table>
        <LoadMore
          hasMore={list.hasMore}
          loading={list.isLoadingMore}
          onClick={list.loadMore}
          count={list.items.length}
        />
      </ListState>
    </div>
  );
}
