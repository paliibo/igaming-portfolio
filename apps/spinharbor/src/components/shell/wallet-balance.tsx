'use client';
import * as React from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { useWallet } from '@igaming/api-client';
import { Skeleton, cn } from '@igaming/ui';
import { compareMinor, formatCredits } from '@/lib/format';

function BalanceText({ balanceMinor }: { balanceMinor: string }) {
  const [previous, setPrevious] = React.useState(balanceMinor);
  const [direction, setDirection] = React.useState<'up' | 'down' | null>(null);
  if (balanceMinor !== previous) {
    setDirection(compareMinor(balanceMinor, previous) > 0 ? 'up' : 'down');
    setPrevious(balanceMinor);
  }
  return (
    <span
      key={balanceMinor}
      data-testid="wallet-balance"
      aria-live="polite"
      className={cn(
        'rounded px-1 font-semibold tabular-nums',
        direction === 'up' && 'animate-price-up',
        direction === 'down' && 'animate-price-down',
      )}
    >
      {formatCredits(balanceMinor)}
    </span>
  );
}

export function WalletBalance({ enabled, className }: { enabled: boolean; className?: string }) {
  const wallet = useWallet(enabled);
  if (!enabled) return null;
  return (
    <Link
      href="/account"
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface-raised px-3 text-sm hover:bg-accent',
        className,
      )}
      aria-label="Wallet balance, open account"
    >
      <Wallet className="h-4 w-4 text-brand" aria-hidden />
      {wallet.data ? (
        <BalanceText balanceMinor={wallet.data.balanceMinor} />
      ) : wallet.isError ? (
        <span className="text-xs text-destructive">Balance unavailable</span>
      ) : (
        <Skeleton className="h-4 w-24" />
      )}
    </Link>
  );
}
