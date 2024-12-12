'use client';
import { Download, FileBarChart2 } from 'lucide-react';
import type { ReportRowDto, ReportsDto } from '@igaming/contracts';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
} from '@igaming/ui';
import { useReports } from '@/lib/api/admin';
import { useUrlFilters } from '@/lib/use-url-filters';
import { downloadCsv, toCsv } from '@/lib/csv';
import {
  formatCount,
  formatCredits,
  formatDate,
  formatDayLabel,
  formatMinor,
  humanize,
} from '@/lib/format';
import { isNegative, isZero } from '@/lib/money';
import { DailyLines, DailyStackedBars } from '@/components/charts/activity-chart';
import { errorMessage } from '@/components/common/list-state';
import { Money } from '@/components/common/money';

const PERIODS = ['7', '14', '30', '90'] as const;
const FILTER_KEYS = ['days'] as const;
const DEFAULTS = { days: '14' } as const;

const MONEY_COLUMNS: {
  key: keyof Omit<ReportRowDto, 'day' | 'betCount' | 'roundCount'>;
  label: string;
}[] = [
  { key: 'topupsMinor', label: 'Top-ups' },
  { key: 'sportsStakeMinor', label: 'Sports stake' },
  { key: 'sportsPayoutMinor', label: 'Sports payout' },
  { key: 'casinoStakeMinor', label: 'Casino stake' },
  { key: 'casinoPayoutMinor', label: 'Casino payout' },
  { key: 'adjustmentsNetMinor', label: 'Adjustments net' },
  { key: 'grossGamingRevenueMinor', label: 'GGR' },
];

function exportCsv(report: ReportsDto, days: number) {
  const headers = [
    'day',
    ...MONEY_COLUMNS.map((c) => `${c.key.replace(/Minor$/, '')} (DMO)`),
    'betCount',
    'roundCount',
  ];
  const rows = report.rows.map((row) => [
    row.day,
    ...MONEY_COLUMNS.map((c) => formatMinor(row[c.key]).replace(/,/g, '')),
    row.betCount,
    row.roundCount,
  ]);
  rows.push([
    'TOTAL',
    ...MONEY_COLUMNS.map((c) => formatMinor(report.totals[c.key]).replace(/,/g, '')),
    report.totals.betCount,
    report.totals.roundCount,
  ]);
  downloadCsv(`ledgerarc-report-${days}d-${report.to.slice(0, 10)}.csv`, toCsv(headers, rows));
}

function ggrClass(minor: string): string | undefined {
  if (isZero(minor)) return undefined;
  return isNegative(minor) ? 'text-destructive' : 'text-success';
}

function ReportBody({ report, days }: { report: ReportsDto; days: number }) {
  if (report.rows.length === 0)
    return (
      <EmptyState
        icon={FileBarChart2}
        title="No report rows"
        description="The selected period contains no days."
      />
    );
  const chartRows = report.rows.map((row) => ({
    day: row.day,
    values: {
      sportsStake: row.sportsStakeMinor,
      casinoStake: row.casinoStakeMinor,
      sportsPayout: row.sportsPayoutMinor,
      casinoPayout: row.casinoPayoutMinor,
      ggr: row.grossGamingRevenueMinor,
      topups: row.topupsMinor,
    },
  }));

  return (
    <>
      <section aria-label="Period totals" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Gross gaming revenue
          </p>
          <p
            className={cn(
              'mt-2 text-2xl font-semibold tabular-nums tracking-tight',
              ggrClass(report.totals.grossGamingRevenueMinor),
            )}
          >
            {formatCredits(report.totals.grossGamingRevenueMinor, { sign: true })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(report.from)} – {formatDate(report.to)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total staked
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
            {formatCredits(
              (
                BigInt(report.totals.sportsStakeMinor) + BigInt(report.totals.casinoStakeMinor)
              ).toString(),
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sports {formatMinor(report.totals.sportsStakeMinor)} · Casino{' '}
            {formatMinor(report.totals.casinoStakeMinor)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total paid out
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
            {formatCredits(
              (
                BigInt(report.totals.sportsPayoutMinor) + BigInt(report.totals.casinoPayoutMinor)
              ).toString(),
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sports {formatMinor(report.totals.sportsPayoutMinor)} · Casino{' '}
            {formatMinor(report.totals.casinoPayoutMinor)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Volume
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
            {formatCount(report.totals.betCount)}{' '}
            <span className="text-base font-normal text-muted-foreground">bets</span> ·{' '}
            {formatCount(report.totals.roundCount)}{' '}
            <span className="text-base font-normal text-muted-foreground">rounds</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Top-ups {formatCredits(report.totals.topupsMinor)}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stakes vs payouts</CardTitle>
            <CardDescription>
              Daily stakes (stacked) against payouts (stacked), DMO credits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailyStackedBars
              rows={chartRows}
              series={[
                {
                  key: 'sportsStake',
                  name: 'Sports stake',
                  color: 'var(--chart-1)',
                  stackId: 'stake',
                },
                {
                  key: 'casinoStake',
                  name: 'Casino stake',
                  color: 'var(--chart-3)',
                  stackId: 'stake',
                },
                {
                  key: 'sportsPayout',
                  name: 'Sports payout',
                  color: 'var(--chart-2)',
                  stackId: 'payout',
                },
                {
                  key: 'casinoPayout',
                  name: 'Casino payout',
                  color: 'var(--chart-4)',
                  stackId: 'payout',
                },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gross gaming revenue</CardTitle>
            <CardDescription>
              Daily GGR (stakes minus payouts) with top-ups for context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DailyLines
              rows={chartRows}
              series={[
                { key: 'ggr', name: 'GGR', color: 'var(--chart-1)' },
                { key: 'topups', name: 'Top-ups', color: 'var(--chart-2)' },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">Daily breakdown</h3>
              <p className="text-xs text-muted-foreground">
                All amounts in DMO credits, settlement-date basis.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportCsv(report, days)}
            >
              <Download aria-hidden />
              Export CSV
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                {MONEY_COLUMNS.map((c) => (
                  <TableHead key={c.key} className="text-right">
                    {c.label}
                  </TableHead>
                ))}
                <TableHead className="text-right">Bets</TableHead>
                <TableHead className="text-right">Rounds</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={row.day}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatDayLabel(row.day)}
                  </TableCell>
                  {MONEY_COLUMNS.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(
                        'text-right',
                        c.key === 'grossGamingRevenueMinor' && 'font-medium',
                      )}
                    >
                      <Money
                        minor={row[c.key]}
                        signed={
                          c.key === 'grossGamingRevenueMinor' || c.key === 'adjustmentsNetMinor'
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">
                    {formatCount(row.betCount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCount(row.roundCount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
                <TableCell>Total</TableCell>
                {MONEY_COLUMNS.map((c) => (
                  <TableCell key={c.key} className="text-right">
                    <Money
                      minor={report.totals[c.key]}
                      signed={
                        c.key === 'grossGamingRevenueMinor' || c.key === 'adjustmentsNetMinor'
                      }
                    />
                  </TableCell>
                ))}
                <TableCell className="text-right tabular-nums">
                  {formatCount(report.totals.betCount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCount(report.totals.roundCount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Accounting definitions</CardTitle>
            <CardDescription>
              How each column is derived from the ledger, as published by the API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {Object.entries(report.definitions).map(([key, text]) => (
                <div key={key}>
                  <dt className="font-medium">
                    {humanize(key.replace(/([a-z])([A-Z])/g, '$1 $2'))}
                  </dt>
                  <dd className="mt-0.5 text-muted-foreground">{text}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function ReportsPage() {
  const filters = useUrlFilters(FILTER_KEYS, DEFAULTS);
  const daysValue = (PERIODS as readonly string[]).includes(filters.values.days)
    ? filters.values.days
    : DEFAULTS.days;
  const days = Number(daysValue);
  const report = useReports(days);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial reports"
        description="Daily top-ups, stakes, payouts and gross gaming revenue derived from wallet transactions."
        actions={
          <Tabs value={daysValue} onValueChange={(value) => filters.set('days', value)}>
            <TabsList aria-label="Report period">
              {PERIODS.map((period) => (
                <TabsTrigger key={period} value={period}>
                  {period} days
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />
      {report.isPending ? (
        <div className="space-y-6" aria-busy>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : report.isError ? (
        <ErrorState
          title="Could not load the report"
          message={errorMessage(report.error)}
          onRetry={() => void report.refetch()}
        />
      ) : (
        <ReportBody report={report.data} days={days} />
      )}
    </div>
  );
}
