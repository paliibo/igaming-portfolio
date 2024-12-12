'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { KYC_STATUSES, PLAYER_STATUSES } from '@igaming/contracts';
import {
  Badge,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@igaming/ui';
import { usePlayers } from '@/lib/api/admin';
import { useUrlFilters } from '@/lib/use-url-filters';
import { formatDate, formatRelative } from '@/lib/format';
import { KYC_LABEL, PLAYER_STATUS_LABEL } from '@/lib/labels';
import { KycBadge, PlayerStatusBadge } from '@/components/common/badges';
import { clickableRowProps } from '@/components/common/clickable-row';
import {
  DebouncedInput,
  FilterBar,
  FilterField,
  FilterSelect,
} from '@/components/common/filter-bar';
import { ListState, LoadMore, TableSkeleton } from '@/components/common/list-state';
import { Money } from '@/components/common/money';

const FILTER_KEYS = ['search', 'status', 'kycStatus'] as const;

export default function PlayersPage() {
  const router = useRouter();
  const filters = useUrlFilters(FILTER_KEYS);
  const { search, status, kycStatus } = filters.values;
  const list = usePlayers({
    search: search || undefined,
    status: status || undefined,
    kycStatus: kycStatus || undefined,
  });
  const setSearch = React.useCallback((value: string) => filters.set('search', value), [filters]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Players"
        description="Search accounts, review status and KYC, and open a profile to manage limits, notes and adjustments."
      />
      <FilterBar onReset={filters.reset} isDirty={filters.isDirty}>
        <FilterField label="Search" htmlFor="players-search" className="basis-64">
          <DebouncedInput
            id="players-search"
            type="search"
            placeholder="Name or email"
            value={search}
            onValueChange={setSearch}
          />
        </FilterField>
        <FilterField label="Status" htmlFor="players-status">
          <FilterSelect
            id="players-status"
            value={status}
            onValueChange={(v) => filters.set('status', v)}
            allLabel="All statuses"
            options={PLAYER_STATUSES.map((s) => ({ value: s, label: PLAYER_STATUS_LABEL[s] }))}
          />
        </FilterField>
        <FilterField label="KYC" htmlFor="players-kyc">
          <FilterSelect
            id="players-kyc"
            value={kycStatus}
            onValueChange={(v) => filters.set('kycStatus', v)}
            allLabel="All KYC states"
            options={KYC_STATUSES.map((s) => ({ value: s, label: KYC_LABEL[s] }))}
          />
        </FilterField>
      </FilterBar>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <ListState
          isPending={list.isPending}
          isError={list.isError}
          error={list.error}
          isEmpty={list.items.length === 0}
          onRetry={list.refetch}
          skeleton={<TableSkeleton columns={6} />}
          empty={{
            icon: Users,
            title: 'No players found',
            description: 'Try a different name, email or status filter.',
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Open alerts</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.items.map((player) => (
                <TableRow
                  key={player.id}
                  data-testid="player-row"
                  {...clickableRowProps(
                    () => router.push(`/players/${player.id}`),
                    `Open profile of ${player.displayName}`,
                  )}
                >
                  <TableCell className="max-w-64">
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate font-medium">{player.displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">{player.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PlayerStatusBadge status={player.profile.status} />
                  </TableCell>
                  <TableCell>
                    <KycBadge status={player.profile.kycStatus} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <Money minor={player.balanceMinor} />
                  </TableCell>
                  <TableCell className="text-right">
                    {player.openAlerts > 0 ? (
                      <Badge variant="warning">{player.openAlerts}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {player.profile.lastLoginAt
                      ? formatRelative(player.profile.lastLoginAt)
                      : 'Never'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(player.createdAt)}
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
      </div>
    </div>
  );
}
