'use client';
import { Wallet } from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@igaming/ui';
import { useLedgerAccounts } from '@/lib/api/admin';
import { LEDGER_KIND_LABEL } from '@/lib/labels';
import { ListState, TableSkeleton } from '@/components/common/list-state';
import { Money } from '@/components/common/money';
import { ReconciliationCard } from '@/components/ledger/reconciliation-status';

const SIGN_RULES: { kind: string; rule: string }[] = [
  {
    kind: 'PLAYER_WALLET',
    rule: 'Liability to players. Credits increase the balance (top-ups, payouts); debits decrease it (stakes, debit adjustments).',
  },
  {
    kind: 'HOUSE_FLOAT',
    rule: 'Asset. Debits increase it when players top up; it funds payouts and credit adjustments.',
  },
  {
    kind: 'SPORTSBOOK_REVENUE',
    rule: 'Revenue. Credited with stakes, debited with payouts and refunds; the balance is sportsbook GGR.',
  },
  {
    kind: 'CASINO_REVENUE',
    rule: 'Revenue. Credited with casino stakes, debited with casino payouts; the balance is casino GGR.',
  },
  {
    kind: 'ADJUSTMENTS',
    rule: 'Contra account for manual corrections and reversals. Debits increase it; a zero balance means every adjustment was later reversed.',
  },
];

export default function WalletsPage() {
  const accounts = useLedgerAccounts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet balances"
        description="Ledger account totals. The first row aggregates every player wallet; all other rows are house accounts."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <ListState
              isPending={accounts.isPending}
              isError={accounts.isError}
              error={accounts.error}
              isEmpty={(accounts.data?.length ?? 0) === 0}
              onRetry={() => void accounts.refetch()}
              skeleton={<TableSkeleton columns={5} rows={5} />}
              empty={{
                icon: Wallet,
                title: 'No ledger accounts',
                description: 'The chart of accounts has not been seeded yet.',
              }}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debits</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.data?.map((account, index) => (
                    <TableRow
                      key={account.id}
                      className={cn(index === 0 && 'bg-brand-soft/60 hover:bg-brand-soft/60')}
                    >
                      <TableCell>
                        <div className="flex min-w-0 flex-col leading-tight">
                          <span className="font-medium">{account.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {account.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.kind === 'PLAYER_WALLET' ? 'brand' : 'outline'}>
                          {LEDGER_KIND_LABEL[account.kind] ?? account.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <Money minor={account.debitTotalMinor} />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <Money minor={account.creditTotalMinor} />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <Money minor={account.balanceMinor} currency />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ListState>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sign convention</CardTitle>
              <CardDescription>
                Every posting debits one account and credits another by the same amount, so the
                ledger always sums to zero. What a “positive balance” means depends on the account
                type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border text-sm">
                {SIGN_RULES.map((row) => (
                  <div
                    key={row.kind}
                    className="grid gap-1 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr] sm:gap-4"
                  >
                    <dt className="flex items-center gap-2 font-mono text-xs">
                      {row.kind}
                      <Badge variant="muted">{LEDGER_KIND_LABEL[row.kind]}</Badge>
                    </dt>
                    <dd className="text-muted-foreground">{row.rule}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                Balance = credits − debits for player wallets and revenue accounts; debits − credits
                for the house float and adjustments. Player wallets are a liability: the operator
                owes players the sum shown as “credits in circulation” on the dashboard.
              </p>
            </CardContent>
          </Card>
        </div>

        <ReconciliationCard />
      </div>
    </div>
  );
}
