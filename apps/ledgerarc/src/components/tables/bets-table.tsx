'use client';
import * as React from 'react';
import { Trophy } from 'lucide-react';
import type { BetDto } from '@igaming/contracts';
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
import { useAdminBets } from '@/lib/api/admin';
import type { QueryFilters } from '@/lib/use-cursor-query';
import { formatDateTime, formatDateTimeFull, formatPrice, humanize } from '@/lib/format';
import { BetStatusBadge } from '@/components/common/badges';
import { clickableRowProps } from '@/components/common/clickable-row';
import { ListState, LoadMore, TableSkeleton } from '@/components/common/list-state';
import { DetailList } from '@/components/common/metadata';
import { Money } from '@/components/common/money';
import { PlayerLink } from '@/components/common/player-link';
import { ShortId } from '@/components/common/short-id';

function SelectionsSummary({ bet }: { bet: BetDto }) {
  const first = bet.selections[0];
  if (!first) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex min-w-0 flex-col leading-tight">
      <span className="truncate font-medium">{first.selectionName}</span>
      <span className="truncate text-xs text-muted-foreground">
        {first.eventName}
        {bet.selections.length > 1 ? ` · +${bet.selections.length - 1} more` : ''}
      </span>
    </div>
  );
}

function BetDetailDialog({ bet, onClose }: { bet: BetDto | null; onClose: () => void }) {
  return (
    <Dialog open={bet !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bet details</DialogTitle>
          <DialogDescription>
            Selections, pricing and the ledger entries that moved the stake and payout.
          </DialogDescription>
        </DialogHeader>
        {bet ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <BetStatusBadge status={bet.status} />
              <Badge variant="outline">
                {bet.selections.length === 1
                  ? 'Single'
                  : `${bet.selections.length}-fold accumulator`}
              </Badge>
            </div>
            <DetailList
              items={[
                {
                  label: 'Bet id',
                  value: <ShortId value={bet.id} length={36} label="bet id" className="-ml-1" />,
                },
                { label: 'Player', value: <PlayerLink player={bet.player} /> },
                { label: 'Stake', value: <Money minor={bet.stakeMinor} currency /> },
                {
                  label: 'Total odds',
                  value: (
                    <span className="tabular-nums">{formatPrice(Number(bet.totalPriceMilli))}</span>
                  ),
                },
                {
                  label: 'Potential payout',
                  value: <Money minor={bet.potentialPayoutMinor} currency />,
                },
                {
                  label: 'Actual payout',
                  value:
                    bet.payoutMinor !== null ? (
                      <Money minor={bet.payoutMinor} currency />
                    ) : (
                      <span className="text-muted-foreground">Not settled</span>
                    ),
                },
                { label: 'Placed', value: formatDateTimeFull(bet.placedAt) },
                {
                  label: 'Settled',
                  value: bet.settledAt ? (
                    formatDateTimeFull(bet.settledAt)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
                },
                {
                  label: 'Stake entry',
                  value: bet.stakeEntryId ? (
                    <ShortId
                      value={bet.stakeEntryId}
                      length={36}
                      label="stake entry id"
                      className="-ml-1"
                    />
                  ) : (
                    '—'
                  ),
                },
                {
                  label: 'Settlement entry',
                  value: bet.settlementEntryId ? (
                    <ShortId
                      value={bet.settlementEntryId}
                      length={36}
                      label="settlement entry id"
                      className="-ml-1"
                    />
                  ) : (
                    '—'
                  ),
                },
              ]}
            />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selections
              </p>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Event</TableHead>
                      <TableHead>Market / selection</TableHead>
                      <TableHead className="text-right">Odds</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bet.selections.map((selection) => (
                      <TableRow key={selection.id}>
                        <TableCell>
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium">{selection.eventName}</span>
                            <span className="text-xs text-muted-foreground">
                              {humanize(selection.eventStatus)} · {selection.homeScore}–
                              {selection.awayScore}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col leading-tight">
                            <span>{selection.selectionName}</span>
                            <span className="text-xs text-muted-foreground">
                              {selection.marketName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatPrice(selection.priceMilli)}
                        </TableCell>
                        <TableCell>
                          {selection.result ? (
                            <Badge
                              variant={
                                selection.result === 'WON'
                                  ? 'success'
                                  : selection.result === 'LOST'
                                    ? 'muted'
                                    : 'warning'
                              }
                            >
                              {humanize(selection.result)}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function BetsTable({
  filters,
  showPlayer = true,
  emptyDescription,
}: {
  filters: QueryFilters;
  showPlayer?: boolean;
  emptyDescription?: string;
}) {
  const list = useAdminBets(filters);
  const [selected, setSelected] = React.useState<BetDto | null>(null);

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
          icon: Trophy,
          title: 'No bets',
          description: emptyDescription ?? 'No sports bets match the current filters.',
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placed</TableHead>
              {showPlayer ? <TableHead>Player</TableHead> : null}
              <TableHead>Selection</TableHead>
              <TableHead className="text-right">Stake</TableHead>
              <TableHead className="text-right">Odds</TableHead>
              <TableHead className="text-right">Potential</TableHead>
              <TableHead className="text-right">Payout</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Settled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((bet) => (
              <TableRow
                key={bet.id}
                {...clickableRowProps(() => setSelected(bet), `Open bet ${bet.id.slice(0, 8)}`)}
              >
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(bet.placedAt)}
                </TableCell>
                {showPlayer ? (
                  <TableCell className="max-w-44">
                    <PlayerLink player={bet.player} />
                  </TableCell>
                ) : null}
                <TableCell className="max-w-64">
                  <SelectionsSummary bet={bet} />
                </TableCell>
                <TableCell className="text-right">
                  <Money minor={bet.stakeMinor} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPrice(Number(bet.totalPriceMilli))}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  <Money minor={bet.potentialPayoutMinor} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {bet.payoutMinor !== null ? (
                    <Money minor={bet.payoutMinor} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <BetStatusBadge status={bet.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {bet.settledAt ? formatDateTime(bet.settledAt) : '—'}
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
      <BetDetailDialog bet={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
