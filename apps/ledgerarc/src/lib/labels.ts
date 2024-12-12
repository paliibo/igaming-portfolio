import type {
  BetStatus,
  JournalKind,
  KycStatus,
  LimitType,
  PlayerStatus,
  RiskAlertStatus,
  RiskSeverity,
} from '@igaming/contracts';

export type BadgeTone =
  'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive' | 'muted' | 'brand';

export const PLAYER_STATUS_LABEL: Record<PlayerStatus, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  COOLING_OFF: 'Cooling off',
  SELF_EXCLUDED: 'Self-excluded',
  CLOSED: 'Closed',
};

export const PLAYER_STATUS_TONE: Record<PlayerStatus, BadgeTone> = {
  ACTIVE: 'success',
  SUSPENDED: 'destructive',
  COOLING_OFF: 'warning',
  SELF_EXCLUDED: 'destructive',
  CLOSED: 'muted',
};

export const KYC_LABEL: Record<KycStatus, string> = {
  PENDING: 'KYC pending',
  VERIFIED: 'KYC verified',
  REJECTED: 'KYC rejected',
};
export const KYC_TONE: Record<KycStatus, BadgeTone> = {
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'destructive',
};

export const BET_STATUS_TONE: Record<BetStatus, BadgeTone> = {
  OPEN: 'brand',
  WON: 'success',
  LOST: 'muted',
  VOID: 'warning',
  CANCELLED: 'muted',
};

export const SEVERITY_TONE: Record<RiskSeverity, BadgeTone> = {
  LOW: 'muted',
  MEDIUM: 'warning',
  HIGH: 'destructive',
};
export const ALERT_STATUS_TONE: Record<RiskAlertStatus, BadgeTone> = {
  OPEN: 'warning',
  RESOLVED: 'success',
  DISMISSED: 'muted',
};

export const JOURNAL_KIND_LABEL: Record<JournalKind, string> = {
  TOPUP: 'Top-up',
  BET_STAKE: 'Bet stake',
  BET_PAYOUT: 'Bet payout',
  BET_REFUND: 'Bet refund',
  CASINO_STAKE: 'Casino stake',
  CASINO_PAYOUT: 'Casino payout',
  ADJUSTMENT_CREDIT: 'Adjustment credit',
  ADJUSTMENT_DEBIT: 'Adjustment debit',
  REVERSAL: 'Reversal',
  TRANSFER: 'Transfer',
};

export const JOURNAL_KIND_TONE: Record<JournalKind, BadgeTone> = {
  TOPUP: 'brand',
  BET_STAKE: 'outline',
  BET_PAYOUT: 'outline',
  BET_REFUND: 'outline',
  CASINO_STAKE: 'outline',
  CASINO_PAYOUT: 'outline',
  ADJUSTMENT_CREDIT: 'secondary',
  ADJUSTMENT_DEBIT: 'secondary',
  REVERSAL: 'warning',
  TRANSFER: 'secondary',
};

export const LIMIT_LABEL: Record<LimitType, string> = {
  DAILY_TOPUP: 'Daily top-up',
  DAILY_WAGER: 'Daily wager',
  DAILY_LOSS: 'Daily loss',
};

export const LIMIT_DESCRIPTION: Record<LimitType, string> = {
  DAILY_TOPUP: 'Maximum credits the player can add to the wallet per calendar day.',
  DAILY_WAGER: 'Maximum total stake across sportsbook and casino per calendar day.',
  DAILY_LOSS: 'Maximum net loss (stakes minus payouts) per calendar day; play stops once reached.',
};

export const LEDGER_KIND_LABEL: Record<string, string> = {
  PLAYER_WALLET: 'Liability',
  HOUSE_FLOAT: 'Asset',
  SPORTSBOOK_REVENUE: 'Revenue',
  CASINO_REVENUE: 'Revenue',
  ADJUSTMENTS: 'Expense / contra',
};
