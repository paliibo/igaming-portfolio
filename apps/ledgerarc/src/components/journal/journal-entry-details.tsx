'use client';
import * as React from 'react';
import Link from 'next/link';
import { Undo2 } from 'lucide-react';
import type { JournalEntryDto } from '@igaming/contracts';
import { Badge, Button } from '@igaming/ui';
import { useIsAdmin } from '@/components/auth/require-auth';
import { KindBadge } from '@/components/common/badges';
import { DetailList, JsonView } from '@/components/common/metadata';
import { PlayerLink } from '@/components/common/player-link';
import { ShortId } from '@/components/common/short-id';
import { formatDateTimeFull } from '@/lib/format';
import { JournalLines } from './journal-lines';
import { ReverseEntryDialog } from './reverse-entry-dialog';

export function canReverse(entry: JournalEntryDto): { allowed: boolean; reason?: string } {
  if (entry.kind === 'REVERSAL')
    return { allowed: false, reason: 'Reversal entries cannot be reversed again.' };
  if (entry.reversedById)
    return { allowed: false, reason: 'This entry has already been reversed.' };
  return { allowed: true };
}

export function ReverseEntryButton({
  entry,
  onSelectEntry,
  size = 'sm',
}: {
  entry: JournalEntryDto;
  onSelectEntry?: (id: string) => void;
  size?: 'sm' | 'default';
}) {
  const isAdmin = useIsAdmin();
  const [open, setOpen] = React.useState(false);
  const state = canReverse(entry);

  if (!isAdmin) return null;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={!state.allowed}
        title={state.reason}
        onClick={() => setOpen(true)}
      >
        <Undo2 aria-hidden />
        Reverse entry
      </Button>
      <ReverseEntryDialog
        entry={entry}
        open={open}
        onOpenChange={setOpen}
        onReversed={(reversal) => onSelectEntry?.(reversal.id)}
      />
    </>
  );
}

export function JournalEntryDetails({
  entry,
  onSelectEntry,
}: {
  entry: JournalEntryDto;
  onSelectEntry?: (id: string) => void;
}) {
  const linkTo = (id: string, label: string) =>
    onSelectEntry ? (
      <button
        type="button"
        onClick={() => onSelectEntry(id)}
        className="inline-flex items-center gap-1 text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        {label} <span className="font-mono text-xs">{id.slice(0, 8)}</span>
      </button>
    ) : (
      <Link
        href={`/journal?entry=${id}`}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        {label} <span className="font-mono text-xs">{id.slice(0, 8)}</span>
      </Link>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <KindBadge kind={entry.kind} />
        {entry.reversedById ? <Badge variant="warning">Reversed</Badge> : null}
        {entry.reversalOfId ? <Badge variant="secondary">Reversal</Badge> : null}
      </div>
      <DetailList
        items={[
          {
            label: 'Entry id',
            value: <ShortId value={entry.id} length={36} label="entry id" className="-ml-1" />,
          },
          { label: 'Description', value: entry.description },
          { label: 'Player', value: <PlayerLink player={entry.player} /> },
          {
            label: 'Reference',
            value: entry.referenceId ? (
              <span className="flex flex-wrap items-center gap-1">
                {entry.referenceType ? (
                  <Badge variant="outline">{entry.referenceType}</Badge>
                ) : null}
                <ShortId
                  value={entry.referenceId}
                  length={36}
                  label="reference"
                  className="-ml-1"
                />
              </span>
            ) : (
              '—'
            ),
          },
          { label: 'Posted', value: formatDateTimeFull(entry.createdAt) },
          {
            label: 'Idempotency key',
            value: entry.idempotencyKey ? (
              <span className="break-all font-mono text-xs">{entry.idempotencyKey}</span>
            ) : (
              '—'
            ),
          },
          ...(entry.reversedById
            ? [{ label: 'Reversed by', value: linkTo(entry.reversedById, 'Reversal entry') }]
            : []),
          ...(entry.reversalOfId
            ? [{ label: 'Reversal of', value: linkTo(entry.reversalOfId, 'Original entry') }]
            : []),
        ]}
      />
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Lines
        </p>
        <JournalLines lines={entry.lines} compact />
      </div>
      {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Metadata
          </p>
          <JsonView value={entry.metadata} />
        </div>
      ) : null}
      <div className="flex justify-end">
        <ReverseEntryButton entry={entry} onSelectEntry={onSelectEntry} />
      </div>
    </div>
  );
}
