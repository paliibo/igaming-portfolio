/**
 * All monetary amounts cross the API as strings of integer minor units.
 * 1 demo credit (DMO) = 100 minor units. Never convert to float for arithmetic.
 */
export const MINOR_PER_CREDIT = 100n;
export const CURRENCY_CODE = 'DMO';

/** Minor-unit string for a whole number of credits, e.g. creditsToMinor(20) === '2000'. */
export function creditsToMinor(credits: number): string {
  if (!Number.isInteger(credits) || credits < 0)
    throw new Error('credits must be a non-negative integer');
  return (BigInt(credits) * MINOR_PER_CREDIT).toString();
}

/** Parses "12.5" / "12" into minor units string, rejecting more than 2 decimals. */
export function parseCreditsInput(value: string): string | null {
  const match = /^\s*(\d{1,12})(?:[.,](\d{1,2}))?\s*$/.exec(value);
  if (!match) return null;
  const whole = BigInt(match[1]!);
  const fraction = BigInt((match[2] ?? '').padEnd(2, '0'));
  return (whole * MINOR_PER_CREDIT + fraction).toString();
}

/** Formats minor units ("2050") as "20.50"; signed values keep their sign. */
export function formatMinor(
  minor: string | bigint | number,
  options: { sign?: boolean } = {},
): string {
  const value = typeof minor === 'bigint' ? minor : BigInt(minor);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / MINOR_PER_CREDIT;
  const fraction = (abs % MINOR_PER_CREDIT).toString().padStart(2, '0');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const prefix = negative ? '-' : options.sign ? '+' : '';
  return `${prefix}${grouped}.${fraction}`;
}

export function formatCredits(
  minor: string | bigint | number,
  options: { sign?: boolean } = {},
): string {
  return `${formatMinor(minor, options)} ${CURRENCY_CODE}`;
}

/** Decimal price in thousandths (2500 → "2.50"). */
export function formatPrice(priceMilli: number): string {
  return (priceMilli / 1000).toFixed(2);
}
