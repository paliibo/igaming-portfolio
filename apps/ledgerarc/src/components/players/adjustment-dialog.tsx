'use client';
import * as React from 'react';
import { toast } from 'sonner';
import { ApiError, newIdempotencyKey } from '@igaming/api-client';
import type { Minor } from '@igaming/contracts';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  cn,
} from '@igaming/ui';
import { useAdjustBalance } from '@/lib/api/admin';
import { formatCredits, parseCreditsInput } from '@/lib/format';
import { Money } from '@/components/common/money';

type Direction = 'CREDIT' | 'DEBIT';

export function AdjustmentDialog({
  playerId,
  balanceMinor,
  open,
  onOpenChange,
}: {
  playerId: string;
  balanceMinor: Minor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const adjust = useAdjustBalance(playerId);
  const [direction, setDirection] = React.useState<Direction>('CREDIT');
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [idempotencyKey, setIdempotencyKey] = React.useState(() => newIdempotencyKey());
  const [serverError, setServerError] = React.useState<string | null>(null);

  const parsed = parseCreditsInput(amount);
  const amountInvalid = amount.trim() !== '' && (parsed === null || BigInt(parsed) === 0n);
  const reasonInvalid = reason.trim().length > 0 && reason.trim().length < 3;
  const insufficient =
    direction === 'DEBIT' && parsed !== null && BigInt(parsed) > BigInt(balanceMinor);
  const canSubmit =
    parsed !== null && BigInt(parsed) > 0n && reason.trim().length >= 3 && !insufficient;
  const resulting = parsed
    ? (direction === 'CREDIT'
        ? BigInt(balanceMinor) + BigInt(parsed)
        : BigInt(balanceMinor) - BigInt(parsed)
      ).toString()
    : null;

  const close = (next: boolean) => {
    if (!next) {
      setDirection('CREDIT');
      setAmount('');
      setReason('');
      setServerError(null);
      setIdempotencyKey(newIdempotencyKey());
    }
    onOpenChange(next);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !parsed) return;
    setServerError(null);
    adjust.mutate(
      { direction, amountMinor: parsed, reason: reason.trim(), idempotencyKey },
      {
        onSuccess: (result) => {
          toast.success(
            result.replayed
              ? 'Adjustment already applied'
              : `Wallet ${direction === 'CREDIT' ? 'credited' : 'debited'} ${formatCredits(parsed)}`,
            {
              description: `New balance ${formatCredits(result.wallet.balanceMinor)} · entry ${result.transaction.entryId.slice(0, 8)}`,
            },
          );
          close(false);
        },
        onError: (error) => {
          if (ApiError.is(error) && error.status === 403)
            setServerError('Only administrators can post balance adjustments.');
          else setServerError(error.message);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual balance adjustment</DialogTitle>
          <DialogDescription>
            Posts a journal entry between the player wallet and the adjustments account. Idempotent:
            retrying this form with the same key will not double-post.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1.5 text-sm font-medium">Direction</legend>
            {(['CREDIT', 'DEBIT'] as Direction[]).map((value) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer flex-col rounded-md border border-border p-3 text-sm hover:bg-accent/50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                  direction === value && 'border-primary bg-brand-soft/60',
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="direction"
                    value={value}
                    checked={direction === value}
                    onChange={() => setDirection(value)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <span className="font-medium">
                    {value === 'CREDIT' ? 'Credit player' : 'Debit player'}
                  </span>
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {value === 'CREDIT'
                    ? 'Adds credits to the wallet (goodwill, refund).'
                    : 'Removes credits from the wallet (correction, clawback).'}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-amount">Amount (DMO credits)</Label>
            <Input
              id="adjust-amount"
              inputMode="decimal"
              placeholder="25.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={amountInvalid || insufficient}
              aria-describedby="adjust-amount-hint"
            />
            <p
              id="adjust-amount-hint"
              className={cn(
                'text-xs',
                amountInvalid || insufficient ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {amountInvalid ? (
                'Enter a positive amount with up to two decimals.'
              ) : insufficient ? (
                'Debit exceeds the current balance.'
              ) : (
                <>
                  Current balance{' '}
                  <Money minor={balanceMinor} currency className="text-foreground" />
                  {resulting !== null ? (
                    <>
                      {' → '}
                      <Money minor={resulting} currency className="text-foreground" />
                    </>
                  ) : null}
                </>
              )}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adjust-reason">Reason</Label>
            <Textarea
              id="adjust-reason"
              rows={3}
              placeholder="Recorded on the journal entry and in the audit log"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={reasonInvalid}
            />
            {reasonInvalid ? (
              <p className="text-xs text-destructive">Reason must be at least 3 characters.</p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Idempotency key <span className="font-mono">{idempotencyKey}</span>
          </p>
          {serverError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={adjust.isPending}
              disabled={!canSubmit}
              variant={direction === 'DEBIT' ? 'destructive' : 'default'}
            >
              {direction === 'CREDIT' ? 'Credit wallet' : 'Debit wallet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
