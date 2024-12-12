export const ROLES = ['PLAYER', 'OPERATOR', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const PLAYER_STATUSES = [
  'ACTIVE',
  'SUSPENDED',
  'COOLING_OFF',
  'SELF_EXCLUDED',
  'CLOSED',
] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export const KYC_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const LIMIT_TYPES = ['DAILY_TOPUP', 'DAILY_WAGER', 'DAILY_LOSS'] as const;
export type LimitType = (typeof LIMIT_TYPES)[number];

export const JOURNAL_KINDS = [
  'TOPUP',
  'BET_STAKE',
  'BET_PAYOUT',
  'BET_REFUND',
  'CASINO_STAKE',
  'CASINO_PAYOUT',
  'ADJUSTMENT_CREDIT',
  'ADJUSTMENT_DEBIT',
  'REVERSAL',
  'TRANSFER',
] as const;
export type JournalKind = (typeof JOURNAL_KINDS)[number];

export const LEDGER_ACCOUNT_KINDS = [
  'PLAYER_WALLET',
  'HOUSE_FLOAT',
  'SPORTSBOOK_REVENUE',
  'CASINO_REVENUE',
  'ADJUSTMENTS',
] as const;
export type LedgerAccountKind = (typeof LEDGER_ACCOUNT_KINDS)[number];

export const EVENT_STATUSES = ['SCHEDULED', 'LIVE', 'FINISHED', 'SETTLED', 'CANCELLED'] as const;
export type SportsEventStatus = (typeof EVENT_STATUSES)[number];

export const MARKET_STATUSES = ['OPEN', 'SUSPENDED', 'CLOSED', 'SETTLED'] as const;
export type MarketStatus = (typeof MARKET_STATUSES)[number];

export const MARKET_TYPES = ['MATCH_WINNER', 'TOTAL', 'BOTH_TEAMS_TO_SCORE', 'HANDICAP'] as const;
export type MarketType = (typeof MARKET_TYPES)[number];

export const BET_STATUSES = ['OPEN', 'WON', 'LOST', 'VOID', 'CANCELLED'] as const;
export type BetStatus = (typeof BET_STATUSES)[number];

export const SELECTION_RESULTS = ['WON', 'LOST', 'VOID'] as const;
export type SelectionResult = (typeof SELECTION_RESULTS)[number];

export const GAME_CATEGORIES = ['SLOTS', 'DICE', 'TABLE', 'INSTANT'] as const;
export type GameCategory = (typeof GAME_CATEGORIES)[number];

export const GAME_STATUSES = ['ACTIVE', 'DISABLED', 'MAINTENANCE'] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

export const RISK_ALERT_TYPES = [
  'LARGE_STAKE',
  'RAPID_PLAY',
  'LIMIT_BREACH_ATTEMPT',
  'DAILY_LOSS',
  'MANUAL',
] as const;
export type RiskAlertType = (typeof RISK_ALERT_TYPES)[number];
export const RISK_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];
export const RISK_ALERT_STATUSES = ['OPEN', 'RESOLVED', 'DISMISSED'] as const;
export type RiskAlertStatus = (typeof RISK_ALERT_STATUSES)[number];
