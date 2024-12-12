import { ApiError } from '@igaming/api-client';

const BET_ERROR_MESSAGES: Record<string, string> = {
  MARKET_NOT_OPEN: 'One of the markets in your slip is no longer open for betting.',
  EVENT_NOT_BETTABLE: 'One of the events in your slip no longer accepts bets.',
  INSUFFICIENT_FUNDS:
    'Your balance is too low for this stake. Top up demo credits on the Account page.',
  LIMIT_EXCEEDED: 'This bet would exceed your daily wagering limit.',
  PLAYER_RESTRICTED: 'Your account is currently restricted from placing bets.',
  STAKE_TOO_LOW: 'The minimum stake is 1.00 DMO.',
  STAKE_TOO_HIGH: 'The maximum stake is 5,000.00 DMO.',
  SAME_EVENT_ACCUMULATOR:
    'An accumulator cannot combine selections from the same event. Switch to singles.',
  VALIDATION_FAILED: 'The bet request was rejected by validation. Check your stake and selections.',
  RATE_LIMITED: 'Too many bets in a short time. Wait a moment and try again.',
  NETWORK_ERROR: 'Could not reach the sportsbook API. Check your connection and try again.',
};

export function describeBetError(error: unknown): string {
  if (ApiError.is(error)) {
    if (error.status === 401) return 'Your session has expired. Sign in again to place bets.';
    return BET_ERROR_MESSAGES[error.code] ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong while placing the bet.';
}

export function describeError(error: unknown, fallback = 'Something went wrong'): string {
  if (ApiError.is(error)) {
    if (error.code === 'VALIDATION_FAILED' && Array.isArray(error.details)) {
      const first = error.details[0] as { path?: string; message?: string } | undefined;
      if (first?.message) return first.path ? `${first.path}: ${first.message}` : first.message;
    }
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
