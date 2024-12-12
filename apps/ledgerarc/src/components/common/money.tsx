import type { Minor } from '@igaming/contracts';
import { cn } from '@igaming/ui';
import { formatCredits, formatMinor } from '@/lib/format';
import { isNegative, isZero } from '@/lib/money';

export interface MoneyProps {
  minor: Minor;
  /** Show a leading "+" for positive values and colour by sign. */
  signed?: boolean;
  /** Append the DMO currency code. */
  currency?: boolean;
  className?: string;
}

export function Money({ minor, signed = false, currency = false, className }: MoneyProps) {
  const text = currency
    ? formatCredits(minor, { sign: signed })
    : formatMinor(minor, { sign: signed });
  const tone =
    signed && !isZero(minor)
      ? isNegative(minor)
        ? 'text-destructive'
        : 'text-success'
      : undefined;
  return <span className={cn('tabular-nums whitespace-nowrap', tone, className)}>{text}</span>;
}
