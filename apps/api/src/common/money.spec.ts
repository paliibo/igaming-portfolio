import { describe, expect, it } from 'vitest';
import { combinedPriceMilli, computePayoutMinor, toBigInt } from './money.js';

describe('money helpers', () => {
  it('computes a single payout exactly (20.00 @ 2.50 = 50.00)', () => {
    expect(computePayoutMinor(2000n, [2500])).toBe(5000n);
  });

  it('floors accumulator payouts to whole minor units', () => {
    expect(computePayoutMinor(1000n, [1850, 1950])).toBe(3607n); // 10.00 * 1.85 * 1.95 = 36.075
    expect(combinedPriceMilli([1850, 1950])).toBe(3607n);
  });

  it('never uses floating point for large stakes', () => {
    expect(computePayoutMinor(500_000_000n, [1001])).toBe(500_500_000n);
  });

  it('rejects unsafe numeric input', () => {
    expect(() => toBigInt(Number.MAX_SAFE_INTEGER + 2)).toThrow();
    expect(() => toBigInt('12.5')).toThrow();
    expect(toBigInt('2000')).toBe(2000n);
  });
});
