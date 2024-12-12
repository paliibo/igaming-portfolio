import type { CasinoGameDto, GameCategory, GameStatus, JournalKind } from '@igaming/contracts';
import { ApiError } from '@igaming/api-client';
import { formatCredits } from './format';

export const CATEGORY_SLUGS = ['slots', 'dice', 'table', 'instant'] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const CATEGORY_META: Record<
  GameCategory,
  { slug: CategorySlug; label: string; blurb: string }
> = {
  SLOTS: { slug: 'slots', label: 'Slots', blurb: 'Reels, paytables and the Harbor Crown jackpot.' },
  DICE: { slug: 'dice', label: 'Dice', blurb: 'Pick a target, choose under or over, roll.' },
  TABLE: {
    slug: 'table',
    label: 'Table',
    blurb: 'Classic card and wheel games from the showcase catalogue.',
  },
  INSTANT: {
    slug: 'instant',
    label: 'Instant',
    blurb: 'Quick-fire rounds with immediate results.',
  },
};

export function categoryFromSlug(slug: string): GameCategory | null {
  const entry = (Object.keys(CATEGORY_META) as GameCategory[]).find(
    (key) => CATEGORY_META[key].slug === slug,
  );
  return entry ?? null;
}

export const STATUS_LABEL: Record<GameStatus, string> = {
  ACTIVE: 'Active',
  MAINTENANCE: 'Maintenance',
  DISABLED: 'Disabled',
};

export type TileState = 'play' | 'showcase' | 'maintenance' | 'disabled';

export function tileState(game: Pick<CasinoGameDto, 'status' | 'playable'>): TileState {
  if (game.status === 'MAINTENANCE') return 'maintenance';
  if (game.status === 'DISABLED') return 'disabled';
  return game.playable ? 'play' : 'showcase';
}

export function playabilityReason(
  game: Pick<CasinoGameDto, 'status' | 'playable' | 'name'>,
): string | null {
  switch (tileState(game)) {
    case 'maintenance':
      return `${game.name} is under maintenance. The operator will re-enable it shortly.`;
    case 'disabled':
      return `${game.name} is currently disabled in the catalogue.`;
    case 'showcase':
      return `${game.name} is a showcase listing that demonstrates catalogue management; it has no playable engine in this demo.`;
    default:
      return null;
  }
}

export const JOURNAL_KIND_LABEL: Record<JournalKind, string> = {
  TOPUP: 'Top-up',
  BET_STAKE: 'Bet stake',
  BET_PAYOUT: 'Bet payout',
  BET_REFUND: 'Bet refund',
  CASINO_STAKE: 'Casino stake',
  CASINO_PAYOUT: 'Casino payout',
  ADJUSTMENT_CREDIT: 'Adjustment (credit)',
  ADJUSTMENT_DEBIT: 'Adjustment (debit)',
  REVERSAL: 'Reversal',
  TRANSFER: 'Transfer',
};

interface StakeRangeDetails {
  minStakeMinor?: string;
  maxStakeMinor?: string;
}

function isStakeRange(details: unknown): details is StakeRangeDetails {
  return typeof details === 'object' && details !== null;
}

/** Human copy for API failures surfaced in toasts and inline alerts. */
export function describeError(error: unknown): string {
  if (!ApiError.is(error)) return error instanceof Error ? error.message : 'Something went wrong';
  switch (error.code) {
    case 'INSUFFICIENT_FUNDS':
      return 'Not enough credits for this stake. Top up from your account page.';
    case 'LIMIT_EXCEEDED':
      return 'This round would exceed one of your daily limits.';
    case 'PLAYER_RESTRICTED':
      return 'Your account is currently restricted from playing.';
    case 'STAKE_OUT_OF_RANGE': {
      const details = isStakeRange(error.details) ? error.details : {};
      if (details.minStakeMinor && details.maxStakeMinor) {
        return `Stake must be between ${formatCredits(details.minStakeMinor)} and ${formatCredits(details.maxStakeMinor)}.`;
      }
      return error.message;
    }
    case 'SESSION_CLOSED':
      return 'Your game session was closed. Start a new one to keep playing.';
    case 'GAME_NOT_PLAYABLE':
      return 'This title is a showcase listing without a playable engine.';
    case 'GAME_IN_MAINTENANCE':
      return 'This game is temporarily under maintenance.';
    case 'RATE_LIMITED':
      return 'You are playing too fast. Give it a moment and try again.';
    case 'NETWORK_ERROR':
      return 'Cannot reach the SpinHarbor API. Check your connection and try again.';
    default:
      return error.message;
  }
}
