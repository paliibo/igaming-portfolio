'use client';
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ApiError } from '@igaming/api-client';
import {
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@igaming/ui';

export function errorMessage(error: unknown): string {
  if (ApiError.is(error)) {
    if (error.status === 403) return 'You do not have permission to view this data.';
    if (error.status === 0) return 'The API is unreachable. Check that the backend is running.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unexpected error';
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Table aria-busy>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r}>
            {Array.from({ length: columns }).map((__, c) => (
              <TableCell key={c}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={className} aria-busy>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

export interface ListStateProps {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isEmpty: boolean;
  onRetry: () => void;
  skeleton?: React.ReactNode;
  empty: { title: string; description?: string; icon?: LucideIcon; action?: React.ReactNode };
  children: React.ReactNode;
}

/** Renders loading / error / empty states, otherwise the children. */
export function ListState({
  isPending,
  isError,
  error,
  isEmpty,
  onRetry,
  skeleton,
  empty,
  children,
}: ListStateProps) {
  if (isPending) return <>{skeleton ?? <TableSkeleton />}</>;
  if (isError) return <ErrorState message={errorMessage(error)} onRetry={onRetry} />;
  if (isEmpty)
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={empty.action}
      />
    );
  return <>{children}</>;
}

export function LoadMore({
  hasMore,
  loading,
  onClick,
  count,
}: {
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2 border-t border-border px-3 py-3 text-xs text-muted-foreground sm:flex-row sm:justify-between">
      <span aria-live="polite">
        Showing {count} {count === 1 ? 'row' : 'rows'}
        {hasMore ? '' : ' · end of results'}
      </span>
      {hasMore ? (
        <Button type="button" variant="outline" size="sm" onClick={onClick} loading={loading}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}
