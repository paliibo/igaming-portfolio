import { z } from 'zod';
import { formatCredits, formatPrice, parseCreditsInput } from '@igaming/contracts';

export const MIN_STAKE_MINOR = 100n;
export const MAX_STAKE_MINOR = 500_000n;
export const MAX_SELECTIONS = 10;
export const PRICE_SCALE = 1000n;

export const stakeInputSchema = z
  .string()
  .trim()
  .min(1, 'Enter a stake')
  .transform((value, ctx) => {
    const minor = parseCreditsInput(value);
    if (minor === null) {
      ctx.addIssue({ code: 'custom', message: 'Use a number with up to two decimals' });
      return z.NEVER;
    }
    return minor;
  })
  .refine(
    (minor) => BigInt(minor) >= MIN_STAKE_MINOR,
    `Minimum stake is ${formatCredits(MIN_STAKE_MINOR)}`,
  )
  .refine(
    (minor) => BigInt(minor) <= MAX_STAKE_MINOR,
    `Maximum stake is ${formatCredits(MAX_STAKE_MINOR)}`,
  );

export type StakeValidation = { ok: true; minor: string } | { ok: false; message: string | null };

/** Validates raw stake text; an empty input is invalid without a message so the UI stays quiet until typing starts. */
export function validateStake(value: string): StakeValidation {
  if (value.trim() === '') return { ok: false, message: null };
  const parsed = stakeInputSchema.safeParse(value);
  if (parsed.success) return { ok: true, minor: parsed.data };
  return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid stake' };
}

/** Product of decimal prices kept in integer thousandths, truncating at each step like the server. */
export function combinedPriceMilli(prices: number[]): bigint {
  return prices.reduce((acc, price) => (acc * BigInt(price)) / PRICE_SCALE, PRICE_SCALE);
}

export function potentialReturnMinor(stakeMinor: string, priceMilli: bigint | number): bigint {
  return (BigInt(stakeMinor) * BigInt(priceMilli)) / PRICE_SCALE;
}

export function formatPriceMilli(priceMilli: bigint | number | string): string {
  const value = BigInt(priceMilli);
  const whole = value / PRICE_SCALE;
  const fraction = ((value % PRICE_SCALE) / 10n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

export function priceDirection(previous: number, next: number): 'up' | 'down' | null {
  if (next > previous) return 'up';
  if (next < previous) return 'down';
  return null;
}

export { formatPrice };

/** Parses a decimal price such as "2.5" or "1.875" into integer thousandths without float math. */
export function parsePriceInput(value: string): number | null {
  const match = /^\s*(\d{1,4})(?:[.,](\d{1,3}))?\s*$/.exec(value);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(3, '0'));
  const milli = whole * 1000 + fraction;
  return milli >= 1001 && milli <= 1_000_000 ? milli : null;
}
