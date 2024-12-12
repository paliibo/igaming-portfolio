'use client';
import * as React from 'react';
import { Coins } from 'lucide-react';
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@igaming/ui';
import { useAdminTransactions } from '@/lib/api/admin';
import type { QueryFilters } from '@/lib/use-cursor-query';
import { formatDateTime } from '@/lib/format';
import { KindBadge } from '@/components/common/badges';
import { clickableRowProps } from '@/components/common/clickable-row';
import { ListState, LoadMore, TableSkeleton } from '@/components/common/list-state';
import { Money } from '@/components/common/money';
import { PlayerLink } from '@/components/common/player-link';
import { ShortId } from '@/components/common/short-id';
import { JournalEntryDrawer } from '@/components/journal/journal-entry-drawer';

export function TransactionsTable({
  filters,
  showPlayer = true,
  emptyDescription,
}: {
  filters: QueryFilters;
  showPlayer?: boolean;
  emptyDescription?: string;
}) {
  const list = useAdminTransactions(filters);
  const [entryId, setEntryId] = React.useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <ListState
        isPending={list.isPending}
        isError={list.isError}
        error={list.error}
        isEmpty={list.items.length === 0}
        onRetry={list.refetch}
        skeleton={<TableSkeleton columns={showPlayer ? 7 : 6} />}
        empty={{
          icon: Coins,
          title: 'No transactions',
          description: emptyDescription ?? 'No wallet transactions match the current filters.',
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              {showPlayer ? <TableHead>Player</TableHead> : null}
              <TableHead>Kind</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance after</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((tx) => (
              <TableRow
                key={tx.id}
                data-testid="transaction-row"
                {...clickableRowProps(
                  () => setEntryId(tx.entryId),
                  `Open journal entry for ${tx.description}`,
                )}
              >
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(tx.createdAt)}
                </TableCell>
                {showPlayer ? (
                  <TableCell className="max-w-48">
                    <PlayerLink player={tx.player} />
                  </TableCell>
                ) : null}
                <TableCell>
                  <KindBadge kind={tx.kind} />
                </TableCell>
                <TableCell className="max-w-72 truncate" title={tx.description}>
                  {tx.description}
                </TableCell>
                <TableCell>
                  {tx.referenceId ? (
                    <span className="flex items-center gap-1">
                      {tx.referenceType ? (
                        <Badge variant="outline" className="hidden xl:inline-flex">
                          {tx.referenceType}
                        </Badge>
                      ) : null}
                      <ShortId value={tx.referenceId} label="reference" />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  <Money minor={tx.amountMinor} signed />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  <Money minor={tx.balanceAfterMinor} />
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
      <JournalEntryDrawer
        entryId={entryId}
        onOpenChange={(open) => !open && setEntryId(null)}
        onSelectEntry={setEntryId}
      />
    </div>
  );
}
