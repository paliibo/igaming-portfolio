'use client';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Coins,
  Dice5,
  RefreshCw,
  ShieldAlert,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
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
  PageHeader,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@igaming/ui';
import type { DashboardMetricsDto } from '@igaming/contracts';
import { useDashboard } from '@/lib/api/admin';
import { formatCount, formatCredits, formatDateTime, formatRelative, humanize } from '@/lib/format';
import { isNegative } from '@/lib/money';
import { KindBadge, SeverityBadge } from '@/components/common/badges';
import { CardSkeleton, errorMessage } from '@/components/common/list-state';
import { Money } from '@/components/common/money';
import { PlayerLink } from '@/components/common/player-link';
import { DailyStackedBars } from '@/components/charts/activity-chart';
import { ReconciliationPill } from '@/components/ledger/reconciliation-status';
import { AlertActions } from '@/components/tables/alerts-list';

function ggrTone(minor: string): 'success' | 'destructive' | 'default' {
  if (BigInt(minor) === 0n) return 'default';
  return isNegative(minor) ? 'destructive' : 'success';
}

function DashboardContent({ d }: { d: DashboardMetricsDto }) {
  return (
    <>
      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Players"
          value={formatCount(d.players.total)}
          icon={Users}
          hint={`${formatCount(d.players.active)} active · ${formatCount(d.players.selfExcluded)} self-excluded · ${formatCount(d.players.suspended)} suspended`}
        />
        <div data-testid="metric-circulation">
          <StatCard
            label="Credits in circulation"
            value={formatCredits(d.creditsInCirculationMinor)}
            icon={Wallet}
            tone="brand"
            hint="Sum of all player wallet balances (liability)"
          />
        </div>
        <StatCard
          label="Top-ups"
          value={formatCredits(d.topupsTotalMinor)}
          icon={Coins}
          hint="All-time credits added to wallets"
        />
        <StatCard
          label="Open alerts"
          value={formatCount(d.openAlerts)}
          icon={ShieldAlert}
          tone={d.openAlerts > 0 ? 'warning' : 'default'}
          hint={
            <Link href="/risk" className="text-primary hover:underline">
              Review risk queue
            </Link>
          }
        />
        <StatCard
          label="Sports bets"
          value={formatCount(d.sportsbook.betCount)}
          icon={Trophy}
          hint={`${formatCount(d.sportsbook.openBetCount)} open`}
        />
        <StatCard
          label="Sports staked / paid"
          value={
            <span className="text-lg sm:text-xl">{formatCredits(d.sportsbook.stakedMinor)}</span>
          }
          hint={`Paid out ${formatCredits(d.sportsbook.paidOutMinor)}`}
        />
        <StatCard
          label="Sportsbook GGR"
          value={formatCredits(d.sportsbook.grossRevenueMinor, { sign: true })}
          tone={ggrTone(d.sportsbook.grossRevenueMinor)}
          hint="Stakes minus payouts, settlement basis"
        />
        <StatCard
          label="Casino rounds"
          value={formatCount(d.casino.roundCount)}
          icon={Dice5}
          hint={`Staked ${formatCredits(d.casino.stakedMinor)} · paid ${formatCredits(d.casino.paidOutMinor)}`}
        />
        <StatCard
          label="Casino GGR"
          value={formatCredits(d.casino.grossRevenueMinor, { sign: true })}
          tone={ggrTone(d.casino.grossRevenueMinor)}
          hint="Stakes minus payouts"
          className="xl:col-start-4"
        />
      </section>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>14-day activity</CardTitle>
            <CardDescription>
              Daily sportsbook and casino stakes stacked, with top-ups alongside (DMO credits).
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports">
              Reports <ArrowRight aria-hidden />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {d.activity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Stakes and top-ups will appear here as players play."
            />
          ) : (
            <DailyStackedBars
              rows={d.activity.map((row) => ({
                day: row.day,
                values: {
                  sports: row.sportsStakeMinor,
                  casino: row.casinoStakeMinor,
                  topup: row.topupMinor,
                },
              }))}
              series={[
                {
                  key: 'sports',
                  name: 'Sports stakes',
                  color: 'var(--chart-1)',
                  stackId: 'stakes',
                },
                {
                  key: 'casino',
                  name: 'Casino stakes',
                  color: 'var(--chart-3)',
                  stackId: 'stakes',
                },
                { key: 'topup', name: 'Top-ups', color: 'var(--chart-2)' },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="min-w-0">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Recent transactions</CardTitle>
              <CardDescription>Latest wallet movements across all players.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/transactions">
                All transactions <ArrowRight aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            {d.recentTransactions.length === 0 ? (
              <EmptyState className="mx-4 sm:mx-5" title="No transactions yet" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-5">Time</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead className="pr-4 text-right sm:pr-5">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap pl-4 text-muted-foreground sm:pl-5">
                        {formatDateTime(tx.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-48">
                        <PlayerLink player={tx.player} />
                      </TableCell>
                      <TableCell>
                        <KindBadge kind={tx.kind} />
                      </TableCell>
                      <TableCell className="pr-4 text-right font-medium sm:pr-5">
                        <Money minor={tx.amountMinor} signed />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Open alerts</CardTitle>
              <CardDescription>Most recent risk signals awaiting review.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/risk">
                Risk queue <ArrowRight aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {d.recentAlerts.length === 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title="No open alerts"
                description="All risk alerts have been resolved or dismissed."
              />
            ) : (
              <ul className="divide-y divide-border">
                {d.recentAlerts.map((alert) => (
                  <li key={alert.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <Badge variant="outline">{humanize(alert.type)}</Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatRelative(alert.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <PlayerLink player={alert.player} showEmail={false} className="text-sm" />
                      <AlertActions alert={alert} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {d.openAlerts > 0 && d.players.suspended + d.players.selfExcluded > 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden />
          {formatCount(d.players.selfExcluded + d.players.suspended)} players are currently
          restricted and {formatCount(d.openAlerts)} alerts are open.
        </p>
      ) : null}
    </>
  );
}

export default function DashboardPage() {
  const dashboard = useDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={
          dashboard.data
            ? `Metrics derived from the ledger · updated ${formatRelative(dashboard.data.generatedAt)}`
            : 'Metrics derived from the ledger'
        }
        actions={
          <>
            <ReconciliationPill />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void dashboard.refetch()}
              loading={dashboard.isFetching && !dashboard.isPending}
              aria-label="Refresh dashboard"
            >
              <RefreshCw aria-hidden />
              Refresh
            </Button>
          </>
        }
      />

      {dashboard.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} className="rounded-lg border border-border bg-card p-4" />
          ))}
        </div>
      ) : dashboard.isError ? (
        <ErrorState
          title="Could not load dashboard"
          message={errorMessage(dashboard.error)}
          onRetry={() => void dashboard.refetch()}
        />
      ) : (
        <DashboardContent d={dashboard.data} />
      )}
    </div>
  );
}
