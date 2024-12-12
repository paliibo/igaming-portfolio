export {
  formatCredits,
  formatMinor,
  formatPrice,
  parseCreditsInput,
  creditsToMinor,
} from '@igaming/contracts';

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDateTimeFull(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatDayLabel(day: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${day}T00:00:00Z`));
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

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value);
}

/** Turns a `yyyy-mm-dd` date input value into the ISO datetime at the start of that day (local time). */
export function dayStartIso(day: string | undefined): string | undefined {
  if (!day) return undefined;
  const date = new Date(`${day}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Turns a `yyyy-mm-dd` date input value into the ISO datetime at the end of that day (local time). */
export function dayEndIso(day: string | undefined): string | undefined {
  if (!day) return undefined;
  const date = new Date(`${day}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** `BET_STAKE` → `Bet stake`. */
export function humanize(value: string): string {
  const lower = value.toLowerCase().replace(/[_.-]+/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function shortId(id: string, length = 8): string {
  return id.length > length ? id.slice(0, length) : id;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
