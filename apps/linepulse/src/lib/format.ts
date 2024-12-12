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

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Today 18:30", "Tomorrow 20:00" or "27 Oct 18:30" for kick-off times. */
export function formatKickoff(iso: string): string {
  const date = new Date(iso);
  const dayDiff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000);
  if (dayDiff === 0) return `Today ${formatTime(iso)}`;
  if (dayDiff === 1) return `Tomorrow ${formatTime(iso)}`;
  return formatDateTime(iso);
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

export function formatClock(clockMinute: number, periodLabel: string | null): string {
  const minute = `${clockMinute}'`;
  return periodLabel ? `${periodLabel} ${minute}` : minute;
}

/** Converts a `datetime-local` input value into an ISO-8601 timestamp, or null when empty/invalid. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
