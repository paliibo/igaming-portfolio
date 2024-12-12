-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'OPERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'COOLING_OFF', 'SELF_EXCLUDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LimitType" AS ENUM ('DAILY_TOPUP', 'DAILY_WAGER', 'DAILY_LOSS');

-- CreateEnum
CREATE TYPE "LedgerAccountKind" AS ENUM ('PLAYER_WALLET', 'HOUSE_FLOAT', 'SPORTSBOOK_REVENUE', 'CASINO_REVENUE', 'ADJUSTMENTS');

-- CreateEnum
CREATE TYPE "JournalEntryKind" AS ENUM ('TOPUP', 'BET_STAKE', 'BET_PAYOUT', 'BET_REFUND', 'CASINO_STAKE', 'CASINO_PAYOUT', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT', 'REVERSAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "LineDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "SportsEventStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('OPEN', 'SUSPENDED', 'CLOSED', 'SETTLED');

-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('MATCH_WINNER', 'TOTAL', 'BOTH_TEAMS_TO_SCORE', 'HANDICAP');

-- CreateEnum
CREATE TYPE "SelectionResult" AS ENUM ('WON', 'LOST', 'VOID');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'VOID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GameCategory" AS ENUM ('SLOTS', 'DICE', 'TABLE', 'INSTANT');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('ACTIVE', 'DISABLED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('ACTIVE', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "GameRoundStatus" AS ENUM ('COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RiskAlertType" AS ENUM ('LARGE_STAKE', 'RAPID_PLAY', 'LIMIT_BREACH_ATTEMPT', 'DAILY_LOSS', 'MANUAL');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RiskAlertStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "country" TEXT NOT NULL DEFAULT 'DEMO',
    "selfExcludedUntil" TIMESTAMP(3),
    "coolingOffUntil" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerLimit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "LimitType" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "setById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "LedgerAccountKind" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DMO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DMO',
    "balanceMinor" BIGINT NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "kind" "JournalEntryKind" NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "reversalOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "direction" "LineDirection" NOT NULL,
    "amountMinor" BIGINT NOT NULL,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "kind" "JournalEntryKind" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "balanceAfterMinor" BIGINT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT,
    "requestHash" TEXT NOT NULL,
    "responseBody" JSONB NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsEvent" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "SportsEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "clockMinute" INTEGER NOT NULL DEFAULT 0,
    "periodLabel" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BettingMarket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "MarketType" NOT NULL,
    "name" TEXT NOT NULL,
    "line" DECIMAL(6,2),
    "status" "MarketStatus" NOT NULL DEFAULT 'OPEN',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BettingMarket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSelection" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outcomeKey" TEXT NOT NULL,
    "priceMilli" INTEGER NOT NULL,
    "priceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceVersion" INTEGER NOT NULL DEFAULT 0,
    "result" "SelectionResult",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MarketSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "stakeMinor" BIGINT NOT NULL,
    "totalPriceMilli" BIGINT NOT NULL,
    "potentialPayoutMinor" BIGINT NOT NULL,
    "payoutMinor" BIGINT,
    "status" "BetStatus" NOT NULL DEFAULT 'OPEN',
    "stakeEntryId" TEXT,
    "settlementEntryId" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetSelection" (
    "id" TEXT NOT NULL,
    "betId" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "priceMilli" INTEGER NOT NULL,
    "result" "SelectionResult",

    CONSTRAINT "BetSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasinoGame" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerGameId" TEXT NOT NULL,
    "category" "GameCategory" NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT NOT NULL,
    "volatility" TEXT NOT NULL,
    "theoreticalRtpLabel" TEXT NOT NULL,
    "minStakeMinor" BIGINT NOT NULL,
    "maxStakeMinor" BIGINT NOT NULL,
    "maxWinMultiplier" INTEGER NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "playable" BOOLEAN NOT NULL DEFAULT false,
    "artwork" JSONB NOT NULL,
    "tags" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasinoGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteGame" (
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteGame_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerSessionRef" TEXT NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "roundNumber" BIGSERIAL NOT NULL,
    "clientRoundKey" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerRoundRef" TEXT NOT NULL,
    "stakeMinor" BIGINT NOT NULL,
    "payoutMinor" BIGINT NOT NULL,
    "status" "GameRoundStatus" NOT NULL,
    "input" JSONB NOT NULL,
    "outcome" JSONB NOT NULL,
    "stakeEntryId" TEXT,
    "payoutEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "RiskAlertType" NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "status" "RiskAlertStatus" NOT NULL DEFAULT 'OPEN',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_userId_key" ON "PlayerProfile"("userId");

-- CreateIndex
CREATE INDEX "PlayerProfile_status_idx" ON "PlayerProfile"("status");

-- CreateIndex
CREATE INDEX "PlayerProfile_kycStatus_idx" ON "PlayerProfile"("kycStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerLimit_userId_type_key" ON "PlayerLimit"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_code_key" ON "LedgerAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_accountId_key" ON "Wallet"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_idempotencyKey_key" ON "JournalEntry"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_reversalOfId_key" ON "JournalEntry"("reversalOfId");

-- CreateIndex
CREATE INDEX "JournalEntry_kind_createdAt_idx" ON "JournalEntry"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "JournalEntry_referenceType_referenceId_idx" ON "JournalEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "JournalEntry_createdAt_idx" ON "JournalEntry"("createdAt");

-- CreateIndex
CREATE INDEX "JournalLine_entryId_idx" ON "JournalLine"("entryId");

-- CreateIndex
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_kind_idx" ON "WalletTransaction"("kind");

-- CreateIndex
CREATE INDEX "WalletTransaction_referenceType_referenceId_idx" ON "WalletTransaction"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_walletId_entryId_key" ON "WalletTransaction"("walletId", "entryId");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_createdAt_idx" ON "IdempotencyRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_scope_key_key" ON "IdempotencyRecord"("scope", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_slug_key" ON "Sport"("slug");

-- CreateIndex
CREATE INDEX "SportsEvent_status_startsAt_idx" ON "SportsEvent"("status", "startsAt");

-- CreateIndex
CREATE INDEX "SportsEvent_sportId_idx" ON "SportsEvent"("sportId");

-- CreateIndex
CREATE INDEX "BettingMarket_eventId_idx" ON "BettingMarket"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSelection_marketId_outcomeKey_key" ON "MarketSelection"("marketId", "outcomeKey");

-- CreateIndex
CREATE INDEX "Bet_userId_placedAt_idx" ON "Bet"("userId", "placedAt");

-- CreateIndex
CREATE INDEX "Bet_status_idx" ON "Bet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Bet_userId_idempotencyKey_key" ON "Bet"("userId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "BetSelection_selectionId_idx" ON "BetSelection"("selectionId");

-- CreateIndex
CREATE INDEX "BetSelection_betId_idx" ON "BetSelection"("betId");

-- CreateIndex
CREATE UNIQUE INDEX "CasinoGame_slug_key" ON "CasinoGame"("slug");

-- CreateIndex
CREATE INDEX "CasinoGame_category_status_idx" ON "CasinoGame"("category", "status");

-- CreateIndex
CREATE INDEX "GameSession_userId_status_idx" ON "GameSession"("userId", "status");

-- CreateIndex
CREATE INDEX "GameRound_userId_createdAt_idx" ON "GameRound"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GameRound_gameId_createdAt_idx" ON "GameRound"("gameId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_userId_clientRoundKey_key" ON "GameRound"("userId", "clientRoundKey");

-- CreateIndex
CREATE INDEX "RiskAlert_status_createdAt_idx" ON "RiskAlert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RiskAlert_userId_idx" ON "RiskAlert"("userId");

-- CreateIndex
CREATE INDEX "AdminNote_userId_createdAt_idx" ON "AdminNote"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerLimit" ADD CONSTRAINT "PlayerLimit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversalOfId_fkey" FOREIGN KEY ("reversalOfId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsEvent" ADD CONSTRAINT "SportsEvent_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BettingMarket" ADD CONSTRAINT "BettingMarket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SportsEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketSelection" ADD CONSTRAINT "MarketSelection_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "BettingMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetSelection" ADD CONSTRAINT "BetSelection_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BetSelection" ADD CONSTRAINT "BetSelection_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "MarketSelection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteGame" ADD CONSTRAINT "FavoriteGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteGame" ADD CONSTRAINT "FavoriteGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "CasinoGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "CasinoGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "CasinoGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAlert" ADD CONSTRAINT "RiskAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAlert" ADD CONSTRAINT "RiskAlert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNote" ADD CONSTRAINT "AdminNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
