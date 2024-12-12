/** Integer minor-unit arithmetic helpers. Never use Number for balances. */

export function toBigInt(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('amount is not a safe integer');
    return BigInt(value);
  }
  if (!/^-?\d+$/.test(value)) throw new Error('amount must be an integer string');
  return BigInt(value);
}

/**
 * Payout for a stake at a combined decimal price expressed in thousandths.
 * payout = stake * Π(price_i / 1000), floored to a whole minor unit.
 */
export function computePayoutMinor(stakeMinor: bigint, pricesMilli: number[]): bigint {
  let numerator = stakeMinor;
  let denominator = 1n;
  for (const p of pricesMilli) {
    numerator *= BigInt(p);
    denominator *= 1000n;
  }
  return numerator / denominator;
}

/** Combined price in thousandths, floored. */
export function combinedPriceMilli(pricesMilli: number[]): bigint {
  let numerator = 1000n;
  let denominator = 1n;
  for (const p of pricesMilli) {
    numerator *= BigInt(p);
    denominator *= 1000n;
  }
  return numerator / denominator;
}

export function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
