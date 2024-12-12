'use client';
import * as React from 'react';
import { Receipt } from 'lucide-react';
import { JOURNAL_KINDS, type JournalKind } from '@igaming/contracts';
import { useWalletTransactions } from '@igaming/api-client';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@igaming/ui';
import { formatCredits, formatDateTime } from '@/lib/format';
import { JOURNAL_KIND_LABEL } from '@/lib/game-meta';

const ALL = 'ALL';

function kindVariant(kind: JournalKind): 'success' | 'destructive' | 'brand' | 'muted' {
  switch (kind) {
    case 'TOPUP':
    case 'BET_PAYOUT':
    case 'CASINO_PAYOUT':
    case 'BET_REFUND':
    case 'ADJUSTMENT_CREDIT':
      return 'success';
    case 'BET_STAKE':
    case 'CASINO_STAKE':
    case 'ADJUSTMENT_DEBIT':
      return 'destructive';
    case 'REVERSAL':
      return 'brand';
    default:
      return 'muted';
  }
}

export function TransactionsTable() {
  const [kind, setKind] = React.useState<string>(ALL);
  const query = useWalletTransactions({ kind: kind === ALL ? undefined : kind, limit: 20 });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Wallet transactions</h3>
        <div className="w-full sm:w-56">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger aria-label="Filter by kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All kinds</SelectItem>
              {JOURNAL_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {JOURNAL_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isError ? (
        <ErrorState
          title="Could not load transactions"
          message={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions"
          description={
            kind === ALL
              ? 'Top-ups, stakes and payouts will be listed here.'
              : `No ${JOURNAL_KIND_LABEL[kind as JournalKind].toLowerCase()} entries yet.`
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance after</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((tx) => {
                  const negative = tx.amountMinor.startsWith('-');
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={kindVariant(tx.kind)}>{JOURNAL_KIND_LABEL[tx.kind]}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[16rem] truncate text-sm" title={tx.description}>
                        {tx.description}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium tabular-nums',
                          negative ? 'text-destructive' : 'text-success',
                        )}
                      >
                        {formatCredits(tx.amountMinor, { sign: true })}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatCredits(tx.balanceAfterMinor)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {query.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.fetchNextPage()}
                loading={query.isFetchingNextPage}
              >
                Load more
              </Button>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              End of history · {items.length} shown
            </p>
          )}
        </>
      )}
    </div>
  );
}
