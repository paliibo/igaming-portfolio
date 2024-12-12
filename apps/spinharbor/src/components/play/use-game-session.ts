'use client';
import * as React from 'react';
import type { GameSessionDto } from '@igaming/contracts';
import { ApiError } from '@igaming/api-client';
import { closeGameSession, createGameSession } from '@/lib/casino-api';

/** Opens a provider session while the game screen is mounted and closes it on unmount or restart. */
export function useGameSession(gameSlug: string, enabled: boolean) {
  const [session, setSession] = React.useState<GameSessionDto | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let opened: GameSessionDto | null = null;
    createGameSession(gameSlug)
      .then((created) => {
        if (cancelled) {
          void closeGameSession(created.id).catch(() => undefined);
          return;
        }
        opened = created;
        setSession(created);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(
          ApiError.is(reason)
            ? reason
            : new ApiError(
                0,
                'UNKNOWN',
                reason instanceof Error ? reason.message : 'Could not open a game session',
              ),
        );
      });
    return () => {
      cancelled = true;
      if (opened) void closeGameSession(opened.id).catch(() => undefined);
    };
  }, [gameSlug, enabled, attempt]);

  const restart = React.useCallback(() => {
    setSession(null);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { session, error, restart, opening: enabled && session === null && error === null };
}
