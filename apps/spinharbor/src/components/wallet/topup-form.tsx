'use client';
import * as React from 'react';
import { Coins } from 'lucide-react';
import { useTopUp } from '@igaming/api-client';
import { Button, Input, Label, cn } from '@igaming/ui';
import { toast } from 'sonner';
import { creditsToMinor, formatCredits, minorToInput, parseCreditsInput } from '@/lib/format';
import { describeError } from '@/lib/game-meta';

const PRESETS = [100, 500, 1000, 5000] as const;

export function TopUpForm() {
  const topUp = useTopUp();
  const [amount, setAmount] = React.useState('500');
  const [error, setError] = React.useState<string | null>(null);
  const minor = parseCreditsInput(amount);
  const valid = minor !== null && BigInt(minor) > 0n;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!minor || !valid) {
      setError('Enter a positive amount in credits, e.g. 250 or 12.50');
      return;
    }
    setError(null);
    topUp.mutate(minor, {
      onSuccess: (data) =>
        toast.success(
          `Added ${formatCredits(data.transaction.amountMinor)}. Balance ${formatCredits(data.wallet.balanceMinor)}.`,
        ),
      onError: (err) => {
        const message = describeError(err);
        setError(message);
        toast.error(message);
      },
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3" aria-labelledby="topup-heading">
      <h3 id="topup-heading" className="text-sm font-semibold">
        Demo top-up
      </h3>
      <p className="text-xs text-muted-foreground">
        Adds virtual DMO credits instantly. Every top-up is a double-entry journal posting visible
        to operators.
      </p>
      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Preset amounts">
        {PRESETS.map((preset) => {
          const presetMinor = creditsToMinor(preset);
          const selected = minor === presetMinor;
          return (
            <Button
              key={preset}
              type="button"
              variant={selected ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAmount(minorToInput(presetMinor))}
              aria-pressed={selected}
              className="tabular-nums"
            >
              {preset.toLocaleString('en-GB')}
            </Button>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="topup-amount">Custom amount (DMO)</Label>
        <Input
          id="topup-amount"
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={!valid}
          aria-describedby="topup-hint"
          className={cn('tabular-nums')}
        />
        <p
          id="topup-hint"
          className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}
          role={error ? 'alert' : undefined}
        >
          {error ?? (valid ? `You will receive ${formatCredits(minor)}` : 'Up to two decimals.')}
        </p>
      </div>
      <Button type="submit" className="w-full" loading={topUp.isPending} disabled={!valid}>
        <Coins aria-hidden /> Add credits
      </Button>
    </form>
  );
}
