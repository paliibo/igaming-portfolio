'use client';
import { Check, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import type { RiskAlertDto } from '@igaming/contracts';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@igaming/ui';
import { useAlerts, useUpdateAlert } from '@/lib/api/admin';
import type { QueryFilters } from '@/lib/use-cursor-query';
import { formatDateTime, humanize } from '@/lib/format';
import { AlertStatusBadge, SeverityBadge } from '@/components/common/badges';
import { ListState, LoadMore, TableSkeleton } from '@/components/common/list-state';
import { MetadataChips } from '@/components/common/metadata';
import { PlayerLink } from '@/components/common/player-link';

export function AlertActions({
  alert,
  size = 'sm',
}: {
  alert: RiskAlertDto;
  size?: 'sm' | 'default';
}) {
  const update = useUpdateAlert();
  if (alert.status !== 'OPEN')
    return (
      <span className="text-xs text-muted-foreground">
        {alert.resolvedAt
          ? `${humanize(alert.status)} ${formatDateTime(alert.resolvedAt)}`
          : humanize(alert.status)}
      </span>
    );
  const run = (status: 'RESOLVED' | 'DISMISSED') =>
    update.mutate(
      { id: alert.id, status },
      {
        onSuccess: () =>
          toast.success(status === 'RESOLVED' ? 'Alert resolved' : 'Alert dismissed'),
        onError: (error) => toast.error(error.message),
      },
    );
  const pending = update.isPending ? update.variables.status : null;
  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        size={size}
        variant="outline"
        onClick={() => run('RESOLVED')}
        loading={pending === 'RESOLVED'}
        disabled={update.isPending}
      >
        <Check aria-hidden />
        Resolve
      </Button>
      <Button
        type="button"
        size={size}
        variant="ghost"
        onClick={() => run('DISMISSED')}
        loading={pending === 'DISMISSED'}
        disabled={update.isPending}
      >
        <X aria-hidden />
        Dismiss
      </Button>
    </div>
  );
}

export function AlertsTable({
  filters,
  showPlayer = true,
  emptyDescription,
}: {
  filters: QueryFilters;
  showPlayer?: boolean;
  emptyDescription?: string;
}) {
  const list = useAlerts(filters);

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
          icon: ShieldCheck,
          title: 'No alerts',
          description: emptyDescription ?? 'Nothing needs attention with the current filters.',
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Raised</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Type</TableHead>
              {showPlayer ? <TableHead>Player</TableHead> : null}
              <TableHead>Message</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(alert.createdAt)}
                </TableCell>
                <TableCell>
                  <SeverityBadge severity={alert.severity} />
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{humanize(alert.type)}</Badge>
                </TableCell>
                {showPlayer ? (
                  <TableCell className="max-w-44">
                    <PlayerLink player={alert.player} />
                  </TableCell>
                ) : null}
                <TableCell className="min-w-56 max-w-md whitespace-normal">
                  {alert.message}
                </TableCell>
                <TableCell>
                  <MetadataChips metadata={alert.metadata} max={3} />
                </TableCell>
                <TableCell>
                  <AlertStatusBadge status={alert.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <AlertActions alert={alert} />
                  </div>
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
  );
}
