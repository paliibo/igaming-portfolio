'use client';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { useWallet } from '@igaming/api-client';
import { Skeleton, cn } from '@igaming/ui';
import { formatCredits } from '@/lib/format';

export function WalletBalance({ enabled, className }: { enabled: boolean; className?: string }) {
  const wallet = useWallet(enabled);
  if (!enabled) return null;
  if (wallet.isLoading) return <Skeleton className={cn('h-8 w-28', className)} />;
  if (!wallet.data) return null;
  return (
    <Link
      href="/account"
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface-raised px-2.5 text-sm font-medium tabular-nums hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
        className,
      )}
      aria-label="Wallet balance, open account"
    >
      <Wallet className="h-4 w-4 text-brand" aria-hidden />
      <span data-testid="wallet-balance" aria-live="polite">
        {formatCredits(wallet.data.balanceMinor)}
      </span>
    </Link>
  );
}
