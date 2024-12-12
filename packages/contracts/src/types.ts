import type {
  BetStatus,
  GameCategory,
  GameStatus,
  JournalKind,
  KycStatus,
  LedgerAccountKind,
  LimitType,
  MarketStatus,
  MarketType,
  PlayerStatus,
  RiskAlertStatus,
  RiskAlertType,
  RiskSeverity,
  Role,
  SelectionResult,
  SportsEventStatus,
} from './enums.js';
import type { RoundInput } from './schemas.js';

/** Integer minor units serialised as a decimal string. */
export type Minor = string;

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

// ---- auth / users ----
export interface PlayerProfileDto {
  status: PlayerStatus;
  kycStatus: KycStatus;
  country: string;
  selfExcludedUntil: string | null;
  coolingOffUntil: string | null;
  suspendedReason: string | null;
  lastLoginAt: string | null;
}

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
  profile: PlayerProfileDto | null;
}

export interface AuthResponse {
  user: UserDto;
}

// ---- wallet ----
export interface WalletDto {
  id: string;
  currency: string;
  balanceMinor: Minor;
  updatedAt: string;
}

export interface WalletTransactionDto {
  id: string;
  kind: JournalKind;
  amountMinor: Minor;
  balanceAfterMinor: Minor;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  entryId: string;
  createdAt: string;
}

export interface TopupResponse {
  wallet: WalletDto;
  transaction: WalletTransactionDto;
}

// ---- sportsbook ----
export interface SportDto {
  id: string;
  slug: string;
  name: string;
  eventCount: number;
}

export interface SelectionDto {
  id: string;
  marketId: string;
  name: string;
  outcomeKey: string;
  priceMilli: number;
  priceVersion: number;
  priceUpdatedAt: string;
  result: SelectionResult | null;
}

export interface MarketDto {
  id: string;
  eventId: string;
  type: MarketType;
  name: string;
  line: string | null;
  status: MarketStatus;
  selections: SelectionDto[];
}

export interface SportsEventDto {
  id: string;
  sport: { id: string; slug: string; name: string };
  competition: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  status: SportsEventStatus;
  homeScore: number;
  awayScore: number;
  clockMinute: number;
  periodLabel: string | null;
  featured: boolean;
  settledAt: string | null;
  markets: MarketDto[];
  betCount?: number;
}

export interface BetSelectionDto {
  id: string;
  selectionId: string;
  priceMilli: number;
  result: SelectionResult | null;
  selectionName: string;
  marketName: string;
  marketType: MarketType;
  eventId: string;
  eventName: string;
  eventStatus: SportsEventStatus;
  homeScore: number;
  awayScore: number;
}

export interface BetDto {
  id: string;
  userId: string;
  stakeMinor: Minor;
  totalPriceMilli: Minor;
  potentialPayoutMinor: Minor;
  payoutMinor: Minor | null;
  status: BetStatus;
  placedAt: string;
  settledAt: string | null;
  stakeEntryId: string | null;
  settlementEntryId: string | null;
  selections: BetSelectionDto[];
  player?: { id: string; email: string; displayName: string };
}

export interface PriceChange {
  selectionId: string;
  selectionName: string;
  submittedPriceMilli: number;
  currentPriceMilli: number;
}

export interface PlaceBetResponse {
  bet: BetDto;
  wallet: WalletDto;
}

// ---- casino ----
export interface GameArtwork {
  gradientFrom: string;
  gradientTo: string;
  accent: string;
  symbol: string;
}

export interface CasinoGameDto {
  id: string;
  slug: string;
  name: string;
  providerKey: string;
  category: GameCategory;
  status: GameStatus;
  description: string;
  volatility: string;
  theoreticalRtpLabel: string;
  minStakeMinor: Minor;
  maxStakeMinor: Minor;
  maxWinMultiplier: number;
  featured: boolean;
  playable: boolean;
  artwork: GameArtwork;
  tags: string[];
  isFavorite?: boolean;
  roundCount?: number;
}

export interface SlotsPaytableRow {
  combination: string[];
  label: string;
  multiplier: number;
}

export interface GameRulesDto {
  slug: string;
  summary: string;
  dice?: {
    houseEdgePercent: number;
    minTarget: number;
    maxTarget: number;
    multiplierFormula: string;
  };
  slots?: {
    symbols: { key: string; label: string; weight: number }[];
    paytable: SlotsPaytableRow[];
  };
}

export interface GameDetailDto extends CasinoGameDto {
  rules: GameRulesDto;
  recentRounds: GameRoundDto[];
}

export interface GameSessionDto {
  id: string;
  gameId: string;
  gameSlug: string;
  status: 'ACTIVE' | 'CLOSED' | 'EXPIRED';
  startedAt: string;
  endedAt: string | null;
}

export interface DiceOutcome {
  type: 'dice';
  roll: number;
  target: number;
  direction: 'under' | 'over';
  win: boolean;
  multiplierMilli: number;
}

export interface SlotsOutcome {
  type: 'slots';
  reels: [string, string, string];
  win: boolean;
  lineLabel: string | null;
  multiplier: number;
}

export type RoundOutcome = DiceOutcome | SlotsOutcome;

export interface GameRoundDto {
  id: string;
  roundNumber: string;
  gameId: string;
  gameSlug: string;
  gameName: string;
  sessionId: string;
  stakeMinor: Minor;
  payoutMinor: Minor;
  netMinor: Minor;
  status: 'COMPLETED' | 'FAILED';
  input: RoundInput;
  outcome: RoundOutcome;
  stakeEntryId: string | null;
  payoutEntryId: string | null;
  createdAt: string;
  completedAt: string | null;
  player?: { id: string; email: string; displayName: string };
}

export interface PlayRoundResponse {
  round: GameRoundDto;
  wallet: WalletDto;
  replayed: boolean;
}

// ---- ledger / admin ----
export interface LedgerAccountDto {
  id: string;
  code: string;
  name: string;
  kind: LedgerAccountKind;
  debitTotalMinor: Minor;
  creditTotalMinor: Minor;
  balanceMinor: Minor;
}

export interface JournalLineDto {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountKind: LedgerAccountKind;
  direction: 'DEBIT' | 'CREDIT';
  amountMinor: Minor;
}

export interface JournalEntryDto {
  id: string;
  kind: JournalKind;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  idempotencyKey: string | null;
  metadata: Record<string, unknown> | null;
  createdById: string | null;
  reversalOfId: string | null;
  reversedById: string | null;
  createdAt: string;
  lines: JournalLineDto[];
  player?: { id: string; email: string; displayName: string } | null;
}

export interface ReconciliationDto {
  checkedAt: string;
  entriesChecked: number;
  unbalancedEntries: string[];
  walletsChecked: number;
  walletMismatches: { walletId: string; cachedMinor: Minor; ledgerMinor: Minor }[];
  balanced: boolean;
}

export interface PlayerLimitDto {
  type: LimitType;
  amountMinor: Minor;
  usedTodayMinor: Minor;
  updatedAt: string;
}

export interface AdminNoteDto {
  id: string;
  body: string;
  author: { id: string; displayName: string };
  createdAt: string;
}

export interface RiskAlertDto {
  id: string;
  type: RiskAlertType;
  severity: RiskSeverity;
  status: RiskAlertStatus;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  resolvedAt: string | null;
  player: { id: string; email: string; displayName: string };
}

export interface AdminPlayerListItemDto {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
  profile: PlayerProfileDto;
  balanceMinor: Minor;
  openAlerts: number;
}

export interface AdminPlayerDetailDto extends AdminPlayerListItemDto {
  wallet: WalletDto;
  limits: PlayerLimitDto[];
  notes: AdminNoteDto[];
  alerts: RiskAlertDto[];
  stats: {
    betCount: number;
    roundCount: number;
    totalStakedMinor: Minor;
    totalWonMinor: Minor;
    totalToppedUpMinor: Minor;
  };
}

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface DashboardMetricsDto {
  generatedAt: string;
  players: { total: number; active: number; selfExcluded: number; suspended: number };
  creditsInCirculationMinor: Minor;
  topupsTotalMinor: Minor;
  sportsbook: {
    betCount: number;
    openBetCount: number;
    stakedMinor: Minor;
    paidOutMinor: Minor;
    grossRevenueMinor: Minor;
  };
  casino: {
    roundCount: number;
    stakedMinor: Minor;
    paidOutMinor: Minor;
    grossRevenueMinor: Minor;
  };
  openAlerts: number;
  recentTransactions: (WalletTransactionDto & {
    player: { id: string; email: string; displayName: string };
  })[];
  recentAlerts: RiskAlertDto[];
  activity: { day: string; sportsStakeMinor: Minor; casinoStakeMinor: Minor; topupMinor: Minor }[];
}

export interface ReportRowDto {
  day: string;
  topupsMinor: Minor;
  sportsStakeMinor: Minor;
  sportsPayoutMinor: Minor;
  casinoStakeMinor: Minor;
  casinoPayoutMinor: Minor;
  adjustmentsNetMinor: Minor;
  grossGamingRevenueMinor: Minor;
  betCount: number;
  roundCount: number;
}

export interface ReportsDto {
  from: string;
  to: string;
  rows: ReportRowDto[];
  totals: Omit<ReportRowDto, 'day'>;
  definitions: Record<string, string>;
}

export interface HealthDto {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  checks: { database: 'up' | 'down'; redis: 'up' | 'down' };
}
