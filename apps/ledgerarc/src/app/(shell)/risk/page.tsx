'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Ban, Clock, Gauge, ShieldAlert } from 'lucide-react';
import { RISK_ALERT_STATUSES, type RiskAlertStatus } from '@igaming/contracts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  PageHeader,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@igaming/ui';
import { useUrlFilters } from '@/lib/use-url-filters';
import { humanize } from '@/lib/format';
import { LIMIT_DESCRIPTION, LIMIT_LABEL } from '@/lib/labels';
import { FilterBar, FilterField } from '@/components/common/filter-bar';
import { PlayerPicker } from '@/components/common/player-picker';
import { AlertsTable } from '@/components/tables/alerts-list';

const FILTER_KEYS = ['status', 'playerId'] as const;
const DEFAULTS = { status: 'OPEN' } as const;

const CONTROLS: { icon: typeof Gauge; title: string; body: string }[] = [
  {
    icon: Gauge,
    title: 'Deposit, wager and loss limits',
    body: 'Set per player on the profile page. The API enforces them on every top-up, bet and casino round; a blocked attempt raises a LIMIT_BREACH_ATTEMPT alert here.',
  },
  {
    icon: Clock,
    title: 'Cooling off',
    body: 'A short break (default 24 hours, configurable in days). Play and top-ups are blocked until the period ends; the account then returns to Active automatically.',
  },
  {
    icon: Ban,
    title: 'Self-exclusion',
    body: 'A long block requested by the player or applied by an operator, for a fixed number of days. It cannot be shortened from the apps and is logged in the audit trail.',
  },
  {
    icon: ShieldAlert,
    title: 'Suspension and closure',
    body: 'Operator-driven restrictions for compliance or fraud review. Suspended accounts can be reactivated with a reason; closed accounts are final.',
  },
];

export default function RiskPage() {
  const router = useRouter();
  const filters = useUrlFilters(FILTER_KEYS, DEFAULTS);
  const status = (RISK_ALERT_STATUSES as readonly string[]).includes(filters.values.status)
    ? (filters.values.status as RiskAlertStatus)
    : 'OPEN';
  const { playerId } = filters.values;
  const [jumpId, setJumpId] = React.useState('');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk alerts"
        description="Signals raised by the risk engine and manual reviews. Resolve an alert once handled, or dismiss it when it is a false positive."
      />

      <Tabs value={status} onValueChange={(value) => filters.set('status', value)}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <TabsList aria-label="Alert status">
            {RISK_ALERT_STATUSES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {humanize(value)}
              </TabsTrigger>
            ))}
          </TabsList>
          <FilterBar
            onReset={() => filters.set('playerId', undefined)}
            isDirty={playerId !== ''}
            className="lg:w-96"
          >
            <FilterField label="Player" htmlFor="risk-player">
              <PlayerPicker
                id="risk-player"
                value={playerId}
                onChange={(id) => filters.set('playerId', id)}
              />
            </FilterField>
          </FilterBar>
        </div>
      </Tabs>

      <AlertsTable
        filters={{ status, playerId: playerId || undefined }}
        emptyDescription={
          status === 'OPEN'
            ? 'No open alerts. New signals appear here automatically.'
            : `No ${humanize(status).toLowerCase()} alerts match the current filters.`
        }
      />

      <section
        id="controls"
        aria-labelledby="controls-title"
        className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      >
        <Card>
          <CardHeader>
            <CardTitle id="controls-title">Responsible gaming controls</CardTitle>
            <CardDescription>
              What each control does and where it is applied. All changes are audited.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-4 sm:grid-cols-2">
              {CONTROLS.map((control) => (
                <li key={control.title} className="flex gap-3 rounded-md border border-border p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                    <control.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{control.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {control.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
              {(Object.keys(LIMIT_LABEL) as (keyof typeof LIMIT_LABEL)[]).map((type) => (
                <div key={type} className="rounded-md bg-muted/60 p-3">
                  <dt className="font-medium text-foreground">{LIMIT_LABEL[type]}</dt>
                  <dd className="mt-1 text-muted-foreground">{LIMIT_DESCRIPTION[type]}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Apply controls to a player</CardTitle>
            <CardDescription>
              Find a player to set limits, start a cooling-off period or self-exclude them from
              their profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="risk-jump">Player</Label>
              <PlayerPicker
                id="risk-jump"
                value={jumpId}
                onChange={setJumpId}
                onPick={(player) => router.push(`/players/${player.id}`)}
                placeholder="Search by name or email"
              />
            </div>
            {jumpId ? (
              <button
                type="button"
                onClick={() => router.push(`/players/${jumpId}`)}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Open player profile <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Picking a result opens the profile directly. Paste a player id and press Enter to
                jump by id.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
