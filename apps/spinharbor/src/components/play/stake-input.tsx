'use client';
import * as React from 'react';
import { Button, Input, Label, cn } from '@igaming/ui';
import { clampMinor, formatCredits, minorToInput, parseCreditsInput } from '@/lib/format';

interface StakeInputProps {
  id: string;
  testId: string;
  value: string;
  onChange: (value: string) => void;
  minStakeMinor: string;
  maxStakeMinor: string;
  balanceMinor?: string;
  disabled?: boolean;
}

export function useStakeMinor(value: string, minStakeMinor: string, maxStakeMinor: string) {
  return React.useMemo(() => {
    const minor = parseCreditsInput(value);
    if (minor === null || BigInt(minor) === 0n)
      return { minor: null, message: 'Enter a stake in credits, e.g. 10 or 2.50' };
    if (BigInt(minor) < BigInt(minStakeMinor))
      return { minor: null, message: `Minimum stake is ${formatCredits(minStakeMinor)}` };
    if (BigInt(minor) > BigInt(maxStakeMinor))
      return { minor: null, message: `Maximum stake is ${formatCredits(maxStakeMinor)}` };
    return { minor, message: null };
  }, [value, minStakeMinor, maxStakeMinor]);
}

export function StakeInput({
  id,
  testId,
  value,
  onChange,
  minStakeMinor,
  maxStakeMinor,
  balanceMinor,
  disabled,
}: StakeInputProps) {
  const { minor, message } = useStakeMinor(value, minStakeMinor, maxStakeMinor);
  const current = minor ?? parseCreditsInput(value) ?? minStakeMinor;
  const apply = (next: bigint) =>
    onChange(minorToInput(clampMinor(next.toString(), minStakeMinor, maxStakeMinor)));

  const presets: { label: string; onClick: () => void; aria: string }[] = [
    { label: 'Min', aria: 'Set minimum stake', onClick: () => apply(BigInt(minStakeMinor)) },
    { label: '½', aria: 'Halve the stake', onClick: () => apply(BigInt(current) / 2n) },
    { label: '2×', aria: 'Double the stake', onClick: () => apply(BigInt(current) * 2n) },
    { label: 'Max', aria: 'Set maximum stake', onClick: () => apply(BigInt(maxStakeMinor)) },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>Stake (DMO)</Label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatCredits(minStakeMinor)} – {formatCredits(maxStakeMinor)}
        </span>
      </div>
      <Input
        id={id}
        data-testid={testId}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={message !== null}
        aria-describedby={`${id}-hint`}
        className={cn('h-11 text-lg font-semibold tabular-nums')}
      />
      <div className="grid grid-cols-4 gap-1.5">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={preset.onClick}
            aria-label={preset.aria}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <p
        id={`${id}-hint`}
        className={cn('text-xs', message ? 'text-destructive' : 'text-muted-foreground')}
      >
        {message ??
          (balanceMinor !== undefined
            ? `Balance ${formatCredits(balanceMinor)}`
            : 'Stake is debited when the round is played.')}
      </p>
    </div>
  );
}
