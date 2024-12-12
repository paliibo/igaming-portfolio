'use client';
import { useRealtime } from '@igaming/api-client';
import { cn } from '@igaming/ui';

const LABELS = { connected: 'Live', connecting: 'Reconnecting…', disconnected: 'Offline' } as const;

export function RealtimeIndicator({ className }: { className?: string }) {
  const { state } = useRealtime();
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 rounded-full',
          state === 'connected' && 'bg-success animate-pulse-dot',
          state === 'connecting' && 'bg-warning animate-pulse-dot',
          state === 'disconnected' && 'bg-destructive',
        )}
      />
      {LABELS[state]}
    </span>
  );
}
