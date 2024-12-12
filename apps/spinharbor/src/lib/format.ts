export {
  formatCredits,
  formatMinor,
  formatPrice,
  parseCreditsInput,
  creditsToMinor,
} from '@igaming/contracts';
import { MINOR_PER_CREDIT } from '@igaming/contracts';

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 1) return 'just now';
  if (Math.abs(minutes) < 60) return minutes > 0 ? `${minutes} min ago` : `in ${-minutes} min`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return hours > 0 ? `${hours} h ago` : `in ${-hours} h`;
  const days = Math.round(hours / 24);
  return days > 0 ? `${days} d ago` : `in ${-days} d`;
}

/** Minor units → plain credits text accepted back by `parseCreditsInput` ("2050" → "20.50", "1000" → "10"). */
export function minorToInput(minor: string | bigint): string {
  const value = typeof minor === 'bigint' ? minor : BigInt(minor);
  const whole = value / MINOR_PER_CREDIT;
  const fraction = value % MINOR_PER_CREDIT;
  return fraction === 0n ? whole.toString() : `${whole}.${fraction.toString().padStart(2, '0')}`;
}

const multiplierFormatter = new Intl.NumberFormat('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

/** Thousandths multiplier (1980) → "1.98×". Display only; payouts always come from the API. */
export function formatMultiplierMilli(multiplierMilli: number): string {
  return `${multiplierFormatter.format(multiplierMilli / 1000)}×`;
}

export function formatMultiplier(multiplier: number): string {
  return `${multiplierFormatter.format(multiplier)}×`;
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)} %`;
}

export function compareMinor(a: string, b: string): number {
  const x = BigInt(a);
  const y = BigInt(b);
  return x === y ? 0 : x > y ? 1 : -1;
}

export function clampMinor(value: string, min: string, max: string): string {
  if (compareMinor(value, min) < 0) return min;
  if (compareMinor(value, max) > 0) return max;
  return value;
}
