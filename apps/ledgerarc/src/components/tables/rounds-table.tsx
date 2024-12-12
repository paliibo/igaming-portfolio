'use client';
import * as React from 'react';
import { Dice5 } from 'lucide-react';
import type { GameRoundDto, RoundOutcome } from '@igaming/contracts';
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@igaming/ui';
import { useAdminRounds } from '@/lib/api/admin';
import type { QueryFilters } from '@/lib/use-cursor-query';
import { formatDateTime, formatDateTimeFull } from '@/lib/format';
import { RoundStatusBadge } from '@/components/common/badges';
import { clickableRowProps } from '@/components/common/clickable-row';
import { ListState, LoadMore, TableSkeleton } from '@/components/common/list-state';
import { DetailList, JsonView } from '@/components/common/metadata';
import { Money } from '@/components/common/money';
import { PlayerLink } from '@/components/common/player-link';
import { ShortId } from '@/components/common/short-id';

export function outcomeSummary(outcome: RoundOutcome): string {
  if (outcome.type === 'dice')
    return `Roll ${outcome.roll.toFixed(2)} · ${outcome.direction} ${outcome.target} · ×${(outcome.multiplierMilli / 1000).toFixed(2)}`;
  return `${outcome.reels.join(' | ')}${outcome.lineLabel ? ` · ${outcome.lineLabel} ×${outcome.multiplier}` : ''}`;
}

function OutcomeBadge({ outcome }: { outcome: RoundOutcome }) {
  return <Badge variant={outcome.win ? 'success' : 'muted'}>{outcome.win ? 'Win' : 'Loss'}</Badge>;
}

function RoundDetailDialog({
  round,
  onClose,
}: {
  round: GameRoundDto | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={round !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Casino round</DialogTitle>
          <DialogDescription>
            Input, outcome and the ledger entries behind the stake and payout.
          </DialogDescription>
        </DialogHeader>
        {round ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <RoundStatusBadge status={round.status} />
              <OutcomeBadge outcome={round.outcome} />
              <Badge variant="outline">{round.gameName}</Badge>
            </div>
            <DetailList
              items={[
                {
                  label: 'Round id',
                  value: (
                    <ShortId value={round.id} length={36} label="round id" className="-ml-1" />
                  ),
                },
                {
                  label: 'Round number',
                  value: <span className="tabular-nums">#{round.roundNumber}</span>,
                },
                { label: 'Player', value: <PlayerLink player={round.player} /> },
                {
                  label: 'Session',
                  value: (
                    <ShortId
                      value={round.sessionId}
                      length={36}
                      label="session id"
                      className="-ml-1"
                    />
                  ),
                },
                { label: 'Stake', value: <Money minor={round.stakeMinor} currency /> },
                { label: 'Payout', value: <Money minor={round.payoutMinor} currency /> },
                {
                  label: 'Net for player',
                  value: <Money minor={round.netMinor} currency signed />,
                },
                { label: 'Outcome', value: outcomeSummary(round.outcome) },
                { label: 'Started', value: formatDateTimeFull(round.createdAt) },
                {
                  label: 'Completed',
                  value: round.completedAt ? formatDateTimeFull(round.completedAt) : '—',
                },
                {
                  label: 'Stake entry',
                  value: round.stakeEntryId ? (
                    <ShortId
                      value={round.stakeEntryId}
                      length={36}
                      label="stake entry id"
                      className="-ml-1"
                    />
                  ) : (
                    '—'
                  ),
                },
                {
                  label: 'Payout entry',
                  value: round.payoutEntryId ? (
                    <ShortId
                      value={round.payoutEntryId}
                      length={36}
                      label="payout entry id"
                      className="-ml-1"
                    />
                  ) : (
                    <span className="text-muted-foreground">No payout posted</span>
                  ),
                },
              ]}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Input
                </p>
                <JsonView value={round.input} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Outcome
                </p>
                <JsonView value={round.outcome} />
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function RoundsTable({
  filters,
  showPlayer = true,
  emptyDescription,
}: {
  filters: QueryFilters;
  showPlayer?: boolean;
  emptyDescription?: string;
}) {
  const list = useAdminRounds(filters);
  const [selected, setSelected] = React.useState<GameRoundDto | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <ListState
        isPending={list.isPending}
        isError={list.isError}
        error={list.error}
        isEmpty={list.items.length === 0}
        onRetry={list.refetch}
        skeleton={<TableSkeleton columns={showPlayer ? 8 : 7} />}
        empty={{
          icon: Dice5,
          title: 'No rounds',
          description: emptyDescription ?? 'No casino rounds match the current filters.',
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              {showPlayer ? <TableHead>Player</TableHead> : null}
              <TableHead>Game</TableHead>
              <TableHead className="text-right">Stake</TableHead>
              <TableHead className="text-right">Payout</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((round) => (
              <TableRow
                key={round.id}
                {...clickableRowProps(() => setSelected(round), `Open round ${round.roundNumber}`)}
              >
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(round.createdAt)}
                </TableCell>
                {showPlayer ? (
                  <TableCell className="max-w-44">
                    <PlayerLink player={round.player} />
                  </TableCell>
                ) : null}
                <TableCell>
                  <div className="flex flex-col leading-tight">
                    <span className="font-medium">{round.gameName}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Round #{round.roundNumber}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Money minor={round.stakeMinor} />
                </TableCell>
                <TableCell className="text-right">
                  <Money minor={round.payoutMinor} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  <Money minor={round.netMinor} signed />
                </TableCell>
                <TableCell className="max-w-64">
                  <span className="flex items-center gap-2">
                    <OutcomeBadge outcome={round.outcome} />
                    <span
                      className="truncate font-mono text-xs text-muted-foreground"
                      title={outcomeSummary(round.outcome)}
                    >
                      {outcomeSummary(round.outcome)}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <RoundStatusBadge status={round.status} />
                </TableCell>
              </TableRow>
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
      <RoundDetailDialog round={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
