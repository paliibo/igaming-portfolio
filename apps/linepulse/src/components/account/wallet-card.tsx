'use client';
import * as React from 'react';
import { Coins } from 'lucide-react';
import { toast } from 'sonner';
import { useTopUp, useWallet } from '@igaming/api-client';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  Input,
  Label,
  Skeleton,
  cn,
} from '@igaming/ui';
import { describeError } from '@/lib/errors';
import { formatCredits, formatDateTime, parseCreditsInput } from '@/lib/format';

const PRESETS = ['100', '500', '1000'];
const MAX_TOPUP_MINOR = 10_000_000n;

export function WalletCard() {
  const wallet = useWallet();
  const topUp = useTopUp();
  const [amount, setAmount] = React.useState('500');
  const amountId = React.useId();

  const minor = parseCreditsInput(amount);
  const amountError =
    amount.trim() === ''
      ? null
      : minor === null
        ? 'Enter a whole number of credits (up to two decimals)'
        : BigInt(minor) === 0n
          ? 'Amount must be greater than zero'
          : BigInt(minor) > MAX_TOPUP_MINOR
            ? 'Maximum demo top-up is 100,000.00 DMO'
            : null;
  const canSubmit = minor !== null && amountError === null && !topUp.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!minor || !canSubmit) return;
    topUp.mutate(minor, {
      onSuccess: (data) =>
        toast.success(`Added ${formatCredits(data.transaction.amountMinor)} to your wallet`),
      onError: (error) => toast.error(describeError(error, 'Top-up failed')),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wallet</CardTitle>
        <CardDescription>
          Demo credits (DMO) are virtual and have no cash value. Top up as often as you like.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {wallet.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : wallet.isError ? (
          <ErrorState
            title="Could not load wallet"
            message={wallet.error.message}
            onRetry={() => void wallet.refetch()}
          />
        ) : wallet.data ? (
          <div className="rounded-lg border border-brand/30 bg-brand-soft p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-brand">
              Available balance
            </p>
            <p
              className="mt-1 text-3xl font-semibold tabular-nums tracking-tight"
              aria-live="polite"
            >
              {formatCredits(wallet.data.balanceMinor)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              Updated {formatDateTime(wallet.data.updatedAt)}
            </p>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-3" aria-label="Demo top-up">
          <div className="flex items-center justify-between">
            <Label htmlFor={amountId}>Top up demo credits</Label>
            <span className="text-[11px] text-muted-foreground">Instant, no real money</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                aria-pressed={amount === preset}
                className={cn(
                  'h-9 rounded-md border border-border text-sm font-medium tabular-nums transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
                  amount === preset && 'border-brand bg-brand-soft text-brand',
                )}
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id={amountId}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Custom amount"
                aria-invalid={Boolean(amountError)}
                aria-describedby={`${amountId}-hint`}
                className="pr-14 tabular-nums"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                DMO
              </span>
            </div>
            <Button type="submit" disabled={!canSubmit} loading={topUp.isPending}>
              <Coins aria-hidden /> Top up
            </Button>
          </div>
          <p
            id={`${amountId}-hint`}
            className={cn('text-xs', amountError ? 'text-destructive' : 'text-muted-foreground')}
            aria-live="polite"
          >
            {amountError ??
              'Credits land in your wallet immediately and appear in the transaction list below.'}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
