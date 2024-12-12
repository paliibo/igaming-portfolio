'use client';
import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { JOURNAL_KINDS, type JournalKind } from '@igaming/contracts';
import { useWalletTransactions } from '@igaming/api-client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

const KIND_LABEL: Record<JournalKind, string> = {
  TOPUP: 'Top-up',
  BET_STAKE: 'Bet stake',
  BET_PAYOUT: 'Bet payout',
  BET_REFUND: 'Bet refund',
  CASINO_STAKE: 'Casino stake',
  CASINO_PAYOUT: 'Casino payout',
  ADJUSTMENT_CREDIT: 'Adjustment (credit)',
  ADJUSTMENT_DEBIT: 'Adjustment (debit)',
  REVERSAL: 'Reversal',
  TRANSFER: 'Transfer',
};

const ALL = 'ALL';

export function TransactionsTable() {
  const [kind, setKind] = React.useState<string>(ALL);
  const transactions = useWalletTransactions({ kind: kind === ALL ? undefined : kind, limit: 20 });
  const items = transactions.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Card>
      <CardHeader className="sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Every wallet movement, newest first.</CardDescription>
        </div>
        <div className="w-full sm:w-52">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger aria-label="Filter by kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All kinds</SelectItem>
              {JOURNAL_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.isLoading ? (
          <div className="space-y-2" aria-busy>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : transactions.isError ? (
          <ErrorState
            title="Could not load transactions"
            message={transactions.error.message}
            onRetry={() => void transactions.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions"
            description={
              kind === ALL
                ? 'Top up or place a bet to see wallet activity here.'
                : `No ${KIND_LABEL[kind as JournalKind].toLowerCase()} transactions yet.`
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((tx) => {
                  const negative = tx.amountMinor.startsWith('-');
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                        {formatDateTime(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={negative ? 'muted' : 'success'}>
                          {KIND_LABEL[tx.kind]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate" title={tx.description}>
                        {tx.description}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'whitespace-nowrap text-right font-medium tabular-nums',
                          negative ? 'text-destructive' : 'text-success',
                        )}
                      >
                        {formatCredits(tx.amountMinor, { sign: true })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {formatCredits(tx.balanceAfterMinor)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-3 flex justify-center">
              {transactions.hasNextPage ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void transactions.fetchNextPage()}
                  loading={transactions.isFetchingNextPage}
                >
                  Load more
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {items.length} transaction{items.length === 1 ? '' : 's'} shown
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
