'use client';
import Link from 'next/link';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  Skeleton,
  cn,
} from '@igaming/ui';
import { useReconciliation } from '@/lib/api/admin';
import { formatCount, formatDateTimeFull, formatRelative } from '@/lib/format';
import { errorMessage } from '@/components/common/list-state';
import { Money } from '@/components/common/money';
import { ShortId } from '@/components/common/short-id';

export function ReconciliationPill({ className }: { className?: string }) {
  const recon = useReconciliation();
  if (recon.isPending) return <Skeleton className={cn('h-7 w-36 rounded-full', className)} />;
  if (recon.isError) {
    return (
      <Link
        href="/wallets"
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 text-xs font-medium text-warning',
          className,
        )}
      >
        <XCircle className="h-3.5 w-3.5" aria-hidden />
        Reconciliation unavailable
      </Link>
    );
  }
  const { balanced, unbalancedEntries, walletMismatches, entriesChecked, walletsChecked } =
    recon.data;
  return (
    <Link
      href="/wallets"
      title={`Checked ${formatCount(entriesChecked)} entries and ${formatCount(walletsChecked)} wallets · ${formatRelative(recon.data.checkedAt)}`}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-ring',
        balanced
          ? 'border-success/40 bg-success/10 text-success'
          : 'border-destructive/40 bg-destructive/10 text-destructive',
        className,
      )}
    >
      {balanced ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <XCircle className="h-3.5 w-3.5" aria-hidden />
      )}
      {balanced
        ? 'Ledger balanced'
        : `Ledger out of balance · ${formatCount(unbalancedEntries.length)} entries, ${formatCount(walletMismatches.length)} wallets`}
    </Link>
  );
}

export function ReconciliationCard() {
  const recon = useReconciliation();

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Reconciliation</CardTitle>
          <CardDescription>
            Re-sums every journal entry and compares each cached wallet balance with its ledger
            account.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void recon.refetch()}
          loading={recon.isFetching}
          disabled={recon.isFetching}
        >
          <RefreshCw aria-hidden />
          Run check
        </Button>
      </CardHeader>
      <CardContent>
        {recon.isPending ? (
          <div className="space-y-3" aria-busy>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : recon.isError ? (
          <ErrorState message={errorMessage(recon.error)} onRetry={() => void recon.refetch()} />
        ) : (
          <div className="space-y-4">
            <div
              className={cn(
                'flex items-center gap-3 rounded-md border p-3',
                recon.data.balanced
                  ? 'border-success/40 bg-success/5'
                  : 'border-destructive/40 bg-destructive/5',
              )}
              role="status"
              aria-live="polite"
            >
              {recon.data.balanced ? (
                <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" aria-hidden />
              )}
              <div>
                <p
                  className={cn(
                    'font-medium',
                    recon.data.balanced ? 'text-success' : 'text-destructive',
                  )}
                >
                  {recon.data.balanced ? 'Ledger balanced' : 'Ledger out of balance'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCount(recon.data.entriesChecked)} entries and{' '}
                  {formatCount(recon.data.walletsChecked)} wallets checked ·{' '}
                  {formatDateTimeFull(recon.data.checkedAt)}
                </p>
              </div>
            </div>
            {recon.data.unbalancedEntries.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Unbalanced entries
                </p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {recon.data.unbalancedEntries.map((id) => (
                    <li key={id}>
                      <Link
                        href={`/journal?entry=${id}`}
                        className="inline-flex items-center rounded border border-destructive/40 px-1.5 py-0.5 font-mono text-xs text-destructive hover:bg-destructive/10"
                      >
                        {id.slice(0, 8)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {recon.data.walletMismatches.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Wallet mismatches
                </p>
                <ul className="mt-1 divide-y divide-border rounded-md border border-border text-sm">
                  {recon.data.walletMismatches.map((m) => (
                    <li
                      key={m.walletId}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <ShortId value={m.walletId} label="wallet id" />
                      <span className="text-xs text-muted-foreground">
                        cached <Money minor={m.cachedMinor} className="text-foreground" /> · ledger{' '}
                        <Money minor={m.ledgerMinor} className="text-foreground" />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
