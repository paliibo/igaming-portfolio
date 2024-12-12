import type { JournalLineDto, Minor } from '@igaming/contracts';

export function sumMinor(values: Iterable<Minor>): bigint {
  let total = 0n;
  for (const value of values) total += BigInt(value);
  return total;
}

export interface LineTotals {
  debit: bigint;
  credit: bigint;
  balanced: boolean;
}

/** Double-entry check computed client side: every entry must debit exactly what it credits. */
export function lineTotals(lines: Pick<JournalLineDto, 'direction' | 'amountMinor'>[]): LineTotals {
  const debit = sumMinor(lines.filter((l) => l.direction === 'DEBIT').map((l) => l.amountMinor));
  const credit = sumMinor(lines.filter((l) => l.direction === 'CREDIT').map((l) => l.amountMinor));
  return { debit, credit, balanced: debit === credit };
}

/** Minor units → whole credits as a JS number, for chart axes only (never for arithmetic on money). */
export function minorToChartValue(minor: Minor): number {
  return Number(BigInt(minor)) / 100;
}

export function isNegative(minor: Minor): boolean {
  return BigInt(minor) < 0n;
}

export function isZero(minor: Minor): boolean {
  return BigInt(minor) === 0n;
}

/** Share of `used` over `limit`, clamped to 0..100, computed with integer maths. */
export function usagePercent(used: Minor, limit: Minor): number {
  const limitValue = BigInt(limit);
  if (limitValue <= 0n) return 0;
  const pct = (BigInt(used) * 100n) / limitValue;
  return Number(pct > 100n ? 100n : pct < 0n ? 0n : pct);
}
