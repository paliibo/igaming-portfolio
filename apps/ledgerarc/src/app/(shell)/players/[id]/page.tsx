'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BadgeCheck, MessageSquarePlus, Scale, UserCog, UserX } from 'lucide-react';
import { ApiError } from '@igaming/api-client';
import type { AdminPlayerDetailDto } from '@igaming/contracts';
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
  Skeleton,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@igaming/ui';
import { usePlayer } from '@/lib/api/admin';
import { useUrlFilters } from '@/lib/use-url-filters';
import {
  formatCount,
  formatCredits,
  formatDate,
  formatDateTime,
  formatDateTimeFull,
  formatRelative,
  isUuid,
} from '@/lib/format';
import { useIsAdmin } from '@/components/auth/require-auth';
import { KycBadge, PlayerStatusBadge } from '@/components/common/badges';
import { errorMessage } from '@/components/common/list-state';
import { Money } from '@/components/common/money';
import { ShortId } from '@/components/common/short-id';
import { AdjustmentDialog } from '@/components/players/adjustment-dialog';
import { SetKycDialog } from '@/components/players/kyc-dialog';
import { LimitsCard } from '@/components/players/limits-card';
import { AddNoteDialog } from '@/components/players/note-dialog';
import { ChangeStatusDialog } from '@/components/players/status-dialog';
import { AlertsTable } from '@/components/tables/alerts-list';
import { AuditTable } from '@/components/tables/audit-table';
import { BetsTable } from '@/components/tables/bets-table';
import { RoundsTable } from '@/components/tables/rounds-table';
import { TransactionsTable } from '@/components/tables/transactions-table';

const TABS = ['transactions', 'bets', 'rounds', 'alerts', 'notes', 'audit'] as const;
type Tab = (typeof TABS)[number];
const FILTER_KEYS = ['tab'] as const;
const DEFAULTS = { tab: 'transactions' } as const;

function RestrictionNotice({ player }: { player: AdminPlayerDetailDto }) {
  const { profile } = player;
  if (profile.status === 'ACTIVE') return null;
  const until =
    profile.status === 'SELF_EXCLUDED'
      ? profile.selfExcludedUntil
      : profile.status === 'COOLING_OFF'
        ? profile.coolingOffUntil
        : null;
  return (
    <div
      className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm"
      role="status"
    >
      <UserX className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="font-medium">
          Account is {profile.status.toLowerCase().replace('_', ' ')}
          {until ? ` until ${formatDateTimeFull(until)}` : ''}
        </p>
        {profile.suspendedReason ? (
          <p className="text-muted-foreground">Reason: {profile.suspendedReason}</p>
        ) : null}
      </div>
    </div>
  );
}

function PlayerHeader({
  player,
  onAction,
}: {
  player: AdminPlayerDetailDto;
  onAction: (action: 'status' | 'kyc' | 'note' | 'adjust') => void;
}) {
  const isAdmin = useIsAdmin();
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {player.displayName}
          </h1>
          <PlayerStatusBadge status={player.profile.status} />
          <KycBadge status={player.profile.kycStatus} />
          {player.openAlerts > 0 ? (
            <Badge variant="warning">{player.openAlerts} open alerts</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{player.email}</p>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <dt>Player id</dt>
            <dd>
              <ShortId value={player.id} length={36} label="player id" />
            </dd>
          </div>
          <div className="flex gap-1">
            <dt>Country</dt>
            <dd className="font-medium text-foreground">{player.profile.country}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Joined</dt>
            <dd className="font-medium text-foreground">{formatDate(player.createdAt)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Last login</dt>
            <dd className="font-medium text-foreground">
              {player.profile.lastLoginAt ? formatRelative(player.profile.lastLoginAt) : 'Never'}
            </dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => onAction('status')}>
          <UserCog aria-hidden />
          Change status
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onAction('kyc')}>
          <BadgeCheck aria-hidden />
          Set KYC
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onAction('note')}>
          <MessageSquarePlus aria-hidden />
          Add note
        </Button>
        {isAdmin ? (
          <Button type="button" size="sm" onClick={() => onAction('adjust')}>
            <Scale aria-hidden />
            Adjust balance
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PlayerDetail({ player }: { player: AdminPlayerDetailDto }) {
  const filters = useUrlFilters(FILTER_KEYS, DEFAULTS);
  const tab: Tab = (TABS as readonly string[]).includes(filters.values.tab)
    ? (filters.values.tab as Tab)
    : 'transactions';
  const [dialog, setDialog] = React.useState<'status' | 'kyc' | 'note' | 'adjust' | null>(null);
  const isAdmin = useIsAdmin();
  const playerFilter = { playerId: player.id };

  return (
    <div className="space-y-6">
      <Link
        href="/players"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All players
      </Link>
      <PlayerHeader player={player} onAction={setDialog} />
      <RestrictionNotice player={player} />

      <section aria-label="Player statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Wallet balance"
          value={formatCredits(player.wallet.balanceMinor)}
          tone="brand"
          hint={`Updated ${formatRelative(player.wallet.updatedAt)}`}
        />
        <StatCard label="Total topped up" value={formatCredits(player.stats.totalToppedUpMinor)} />
        <StatCard
          label="Total staked"
          value={formatCredits(player.stats.totalStakedMinor)}
          hint={`${formatCount(player.stats.betCount)} bets · ${formatCount(player.stats.roundCount)} rounds`}
        />
        <StatCard label="Total won" value={formatCredits(player.stats.totalWonMinor)} />
        <StatCard
          label="Net position"
          value={
            <Money
              minor={(
                BigInt(player.stats.totalWonMinor) - BigInt(player.stats.totalStakedMinor)
              ).toString()}
              signed
              currency
            />
          }
          hint="Won minus staked, lifetime"
        />
      </section>

      <LimitsCard playerId={player.id} limits={player.limits} />

      <Tabs value={tab} onValueChange={(value) => filters.set('tab', value)}>
        <TabsList aria-label="Player activity" className="h-auto flex-wrap justify-start">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="bets">Bets</TabsTrigger>
          <TabsTrigger value="rounds">Casino rounds</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts{player.openAlerts > 0 ? ` (${player.openAlerts})` : ''}
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes{player.notes.length > 0 ? ` (${player.notes.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          <TransactionsTable
            filters={playerFilter}
            showPlayer={false}
            emptyDescription="This player has no wallet transactions yet."
          />
        </TabsContent>
        <TabsContent value="bets">
          <BetsTable
            filters={playerFilter}
            showPlayer={false}
            emptyDescription="This player has not placed any sports bets."
          />
        </TabsContent>
        <TabsContent value="rounds">
          <RoundsTable
            filters={playerFilter}
            showPlayer={false}
            emptyDescription="This player has not played any casino rounds."
          />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertsTable
            filters={playerFilter}
            showPlayer={false}
            emptyDescription="No risk alerts have been raised for this player."
          />
        </TabsContent>
        <TabsContent value="notes">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Internal notes</CardTitle>
                <CardDescription>Context left by operators. Newest first.</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setDialog('note')}>
                <MessageSquarePlus aria-hidden />
                Add note
              </Button>
            </CardHeader>
            <CardContent>
              {player.notes.length === 0 ? (
                <EmptyState
                  title="No notes yet"
                  description="Add the first note to give colleagues context on this account."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {player.notes.map((note) => (
                    <li key={note.id} className="py-3 first:pt-0 last:pb-0">
                      <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {note.author.displayName} · {formatDateTime(note.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit">
          <AuditTable
            filters={{ targetId: player.id }}
            emptyDescription="No staff actions have targeted this player yet."
          />
        </TabsContent>
      </Tabs>

      <ChangeStatusDialog
        key={`status-${player.profile.status}`}
        playerId={player.id}
        current={player.profile.status}
        open={dialog === 'status'}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <SetKycDialog
        key={`kyc-${player.profile.kycStatus}`}
        playerId={player.id}
        current={player.profile.kycStatus}
        open={dialog === 'kyc'}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <AddNoteDialog
        playerId={player.id}
        open={dialog === 'note'}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      {isAdmin ? (
        <AdjustmentDialog
          playerId={player.id}
          balanceMinor={player.wallet.balanceMinor}
          open={dialog === 'adjust'}
          onOpenChange={(open) => !open && setDialog(null)}
        />
      ) : null}
    </div>
  );
}

export default function PlayerPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const valid = isUuid(id);
  const player = usePlayer(id, valid);

  if (!valid || (player.isError && ApiError.is(player.error) && player.error.status === 404)) {
    return (
      <EmptyState
        icon={UserX}
        title="Player not found"
        description={`No player exists with id ${id}.`}
        action={
          <Button asChild variant="outline">
            <Link href="/players">Back to players</Link>
          </Button>
        }
      />
    );
  }
  if (player.isPending) {
    return (
      <div className="space-y-6" aria-busy>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-32" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (player.isError)
    return (
      <ErrorState
        title="Could not load player"
        message={errorMessage(player.error)}
        onRetry={() => void player.refetch()}
      />
    );
  return <PlayerDetail player={player.data} />;
}
