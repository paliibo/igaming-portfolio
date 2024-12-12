'use client';
import * as React from 'react';
import { ScrollText } from 'lucide-react';
import type { AuditLogDto } from '@igaming/contracts';
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@igaming/ui';
import { useAudit } from '@/lib/api/admin';
import type { QueryFilters } from '@/lib/use-cursor-query';
import { formatDateTime, formatDateTimeFull } from '@/lib/format';
import { clickableRowProps } from '@/components/common/clickable-row';
import { ListState, LoadMore, TableSkeleton } from '@/components/common/list-state';
import { DetailList, JsonView, MetadataChips } from '@/components/common/metadata';
import { ShortId } from '@/components/common/short-id';

function AuditDetailDialog({ log, onClose }: { log: AuditLogDto | null; onClose: () => void }) {
  return (
    <Dialog open={log !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Audit event</DialogTitle>
          <DialogDescription>
            Immutable record of a staff action, including the full metadata payload.
          </DialogDescription>
        </DialogHeader>
        {log ? (
          <div className="space-y-4">
            <DetailList
              items={[
                {
                  label: 'Event id',
                  value: <ShortId value={log.id} length={36} label="event id" className="-ml-1" />,
                },
                { label: 'Time', value: formatDateTimeFull(log.createdAt) },
                {
                  label: 'Action',
                  value: (
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {log.action}
                    </code>
                  ),
                },
                {
                  label: 'Actor',
                  value: log.actorEmail ?? <span className="text-muted-foreground">System</span>,
                },
                {
                  label: 'Actor id',
                  value: log.actorId ? (
                    <ShortId value={log.actorId} length={36} label="actor id" className="-ml-1" />
                  ) : (
                    '—'
                  ),
                },
                {
                  label: 'Target',
                  value: (
                    <span className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline">{log.targetType}</Badge>
                      {log.targetId ? (
                        <ShortId
                          value={log.targetId}
                          length={36}
                          label="target id"
                          className="-ml-1"
                        />
                      ) : null}
                    </span>
                  ),
                },
                {
                  label: 'IP address',
                  value: log.ipAddress ? (
                    <span className="font-mono text-xs">{log.ipAddress}</span>
                  ) : (
                    '—'
                  ),
                },
              ]}
            />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Metadata
              </p>
              <JsonView value={log.metadata} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function AuditTable({
  filters,
  emptyDescription,
}: {
  filters: QueryFilters;
  emptyDescription?: string;
}) {
  const list = useAudit(filters);
  const [selected, setSelected] = React.useState<AuditLogDto | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <ListState
        isPending={list.isPending}
        isError={list.isError}
        error={list.error}
        isEmpty={list.items.length === 0}
        onRetry={list.refetch}
        skeleton={<TableSkeleton columns={6} />}
        empty={{
          icon: ScrollText,
          title: 'No audit events',
          description: emptyDescription ?? 'No staff actions match the current filters.',
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Metadata</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.items.map((log) => (
              <TableRow
                key={log.id}
                {...clickableRowProps(() => setSelected(log), `Open audit event ${log.action}`)}
              >
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTime(log.createdAt)}
                </TableCell>
                <TableCell className="max-w-48 truncate">
                  {log.actorEmail ?? <span className="text-muted-foreground">System</span>}
                </TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    {log.action}
                  </code>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1">
                    <Badge variant="outline">{log.targetType}</Badge>
                    {log.targetId ? <ShortId value={log.targetId} label="target id" /> : null}
                  </span>
                </TableCell>
                <TableCell className="max-w-sm">
                  <MetadataChips metadata={log.metadata} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.ipAddress ?? '—'}
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
      <AuditDetailDialog log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
