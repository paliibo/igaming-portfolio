'use client';
import { useRealtime } from '@igaming/api-client';
import { cn } from '@igaming/ui';

const COPY = {
  connected: { label: 'Live', dot: 'bg-success', pulse: false },
  connecting: { label: 'Reconnecting…', dot: 'bg-warning', pulse: true },
  disconnected: { label: 'Offline', dot: 'bg-destructive', pulse: false },
} as const;

export function RealtimeIndicator({ className }: { className?: string }) {
  const { state } = useRealtime();
  const copy = COPY[state];
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          copy.dot,
          copy.pulse && 'animate-pulse-dot',
        )}
        aria-hidden
      />
      {copy.label}
    </span>
  );
}
