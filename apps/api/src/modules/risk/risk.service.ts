import { Injectable } from '@nestjs/common';
import type { LimitType, PlayerLimitDto } from '@igaming/contracts';
import {
  type PlayerProfile,
  type RiskAlertType,
  type RiskSeverity,
  Prisma,
} from '@igaming/database';
import { PrismaService, type DbClient, type Tx } from '../../common/prisma.service.js';
import { LimitExceededError, PlayerRestrictedError } from '../../common/errors.js';
import { startOfUtcDay } from '../../common/money.js';

export const LARGE_STAKE_THRESHOLD_MINOR = 20_000n; // 200 credits
export const RAPID_PLAY_ROUNDS_PER_MINUTE = 15;

/**
 * Responsible-gaming and risk controls. Everything here is enforced server-side inside the same
 * transaction that moves money, so a self-excluded or over-limit player cannot wager.
 */
@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(db: DbClient, userId: string): Promise<PlayerProfile> {
    const profile = await db.playerProfile.findUnique({ where: { userId } });
    if (!profile) throw new PlayerRestrictedError('MISSING_PROFILE');
    return this.expireTemporaryRestrictions(db, profile);
  }

  /** Throws if the player's status forbids wagering or the stake breaches a daily limit. */
  async assertCanWager(tx: Tx, userId: string, stakeMinor: bigint): Promise<void> {
    const profile = await this.getProfile(tx, userId);
    if (profile.status !== 'ACTIVE')
      throw new PlayerRestrictedError(profile.status, {
        until: profile.selfExcludedUntil ?? profile.coolingOffUntil,
      });

    const limits = await tx.playerLimit.findMany({
      where: { userId, type: { in: ['DAILY_WAGER', 'DAILY_LOSS'] } },
    });
    if (limits.length === 0) return;
    const usage = await this.todayUsage(tx, userId);
    for (const limit of limits) {
      if (limit.type === 'DAILY_WAGER' && usage.wageredMinor + stakeMinor > limit.amountMinor) {
        throw new LimitExceededError('DAILY_WAGER', {
          limitMinor: limit.amountMinor.toString(),
          usedTodayMinor: usage.wageredMinor.toString(),
        });
      }
      if (limit.type === 'DAILY_LOSS' && usage.netLossMinor + stakeMinor > limit.amountMinor) {
        throw new LimitExceededError('DAILY_LOSS', {
          limitMinor: limit.amountMinor.toString(),
          lostTodayMinor: usage.netLossMinor.toString(),
        });
      }
    }
  }

  async assertCanTopUp(tx: Tx, userId: string, amountMinor: bigint): Promise<void> {
    const profile = await this.getProfile(tx, userId);
    if (
      profile.status === 'SELF_EXCLUDED' ||
      profile.status === 'CLOSED' ||
      profile.status === 'SUSPENDED'
    ) {
      throw new PlayerRestrictedError(profile.status);
    }
    const limit = await tx.playerLimit.findUnique({
      where: { userId_type: { userId, type: 'DAILY_TOPUP' } },
    });
    if (!limit) return;
    const usage = await this.todayUsage(tx, userId);
    if (usage.toppedUpMinor + amountMinor > limit.amountMinor) {
      throw new LimitExceededError('DAILY_TOPUP', {
        limitMinor: limit.amountMinor.toString(),
        usedTodayMinor: usage.toppedUpMinor.toString(),
      });
    }
  }

  async todayUsage(
    db: DbClient,
    userId: string,
  ): Promise<{ wageredMinor: bigint; toppedUpMinor: bigint; netLossMinor: bigint }> {
    const since = startOfUtcDay();
    const rows = await db.$queryRaw<{ kind: string; total: bigint }[]>`
      SELECT t.kind, COALESCE(SUM(ABS(t."amountMinor")), 0)::bigint AS total
      FROM "WalletTransaction" t JOIN "Wallet" w ON w.id = t."walletId"
      WHERE w."userId" = ${userId} AND t."createdAt" >= ${since}
        AND NOT (t.kind = 'TOPUP' AND t."referenceType" = 'WELCOME')
      GROUP BY t.kind`;
    const byKind = new Map(rows.map((r) => [r.kind, BigInt(r.total)]));
    const stakes = (byKind.get('BET_STAKE') ?? 0n) + (byKind.get('CASINO_STAKE') ?? 0n);
    const wins =
      (byKind.get('BET_PAYOUT') ?? 0n) +
      (byKind.get('CASINO_PAYOUT') ?? 0n) +
      (byKind.get('BET_REFUND') ?? 0n);
    const netLoss = stakes - wins;
    return {
      wageredMinor: stakes,
      toppedUpMinor: byKind.get('TOPUP') ?? 0n,
      netLossMinor: netLoss > 0n ? netLoss : 0n,
    };
  }

  async listLimits(userId: string): Promise<PlayerLimitDto[]> {
    const [limits, usage] = await Promise.all([
      this.prisma.client.playerLimit.findMany({ where: { userId } }),
      this.todayUsage(this.prisma.client, userId),
    ]);
    return limits.map((l) => ({
      type: l.type,
      amountMinor: l.amountMinor.toString(),
      usedTodayMinor: (l.type === 'DAILY_TOPUP'
        ? usage.toppedUpMinor
        : l.type === 'DAILY_WAGER'
          ? usage.wageredMinor
          : usage.netLossMinor
      ).toString(),
      updatedAt: l.updatedAt.toISOString(),
    }));
  }

  async setLimit(
    userId: string,
    type: LimitType,
    amountMinor: bigint | null,
    setById: string,
  ): Promise<void> {
    if (amountMinor === null) {
      await this.prisma.client.playerLimit.deleteMany({ where: { userId, type } });
      return;
    }
    await this.prisma.client.playerLimit.upsert({
      where: { userId_type: { userId, type } },
      update: { amountMinor, setById },
      create: { userId, type, amountMinor, setById },
    });
  }

  async raiseAlert(params: {
    userId: string;
    type: RiskAlertType;
    severity: RiskSeverity;
    message: string;
    metadata?: Prisma.InputJsonValue;
    dedupeMinutes?: number;
  }): Promise<void> {
    if (params.dedupeMinutes) {
      const recent = await this.prisma.client.riskAlert.findFirst({
        where: {
          userId: params.userId,
          type: params.type,
          status: 'OPEN',
          createdAt: { gte: new Date(Date.now() - params.dedupeMinutes * 60_000) },
        },
      });
      if (recent) return;
    }
    await this.prisma.client.riskAlert.create({
      data: {
        userId: params.userId,
        type: params.type,
        severity: params.severity,
        message: params.message,
        metadata: params.metadata,
      },
    });
  }

  /** Post-wager heuristics; runs after the money has moved and never blocks the player action. */
  async evaluateAfterWager(
    userId: string,
    stakeMinor: bigint,
    source: 'sportsbook' | 'casino',
  ): Promise<void> {
    if (stakeMinor >= LARGE_STAKE_THRESHOLD_MINOR) {
      await this.raiseAlert({
        userId,
        type: 'LARGE_STAKE',
        severity: stakeMinor >= LARGE_STAKE_THRESHOLD_MINOR * 5n ? 'HIGH' : 'MEDIUM',
        message: `Large ${source} stake of ${(Number(stakeMinor) / 100).toFixed(2)} credits`,
        metadata: { stakeMinor: stakeMinor.toString(), source },
        dedupeMinutes: 5,
      });
    }
    if (source === 'casino') {
      const recentRounds = await this.prisma.client.gameRound.count({
        where: { userId, createdAt: { gte: new Date(Date.now() - 60_000) } },
      });
      if (recentRounds > RAPID_PLAY_ROUNDS_PER_MINUTE) {
        await this.raiseAlert({
          userId,
          type: 'RAPID_PLAY',
          severity: 'LOW',
          message: `${recentRounds} casino rounds in the last minute`,
          metadata: { recentRounds },
          dedupeMinutes: 10,
        });
      }
    }
  }

  async recordLimitBreachAttempt(
    userId: string,
    limitType: string,
    attemptedMinor: bigint,
  ): Promise<void> {
    await this.raiseAlert({
      userId,
      type: 'LIMIT_BREACH_ATTEMPT',
      severity: 'LOW',
      message: `Attempted to exceed ${limitType.toLowerCase().replace('_', ' ')} limit`,
      metadata: { limitType, attemptedMinor: attemptedMinor.toString() },
      dedupeMinutes: 15,
    });
  }

  private async expireTemporaryRestrictions(
    db: DbClient,
    profile: PlayerProfile,
  ): Promise<PlayerProfile> {
    const now = new Date();
    if (
      profile.status === 'COOLING_OFF' &&
      profile.coolingOffUntil &&
      profile.coolingOffUntil <= now
    ) {
      return db.playerProfile.update({
        where: { id: profile.id },
        data: { status: 'ACTIVE', coolingOffUntil: null },
      });
    }
    if (
      profile.status === 'SELF_EXCLUDED' &&
      profile.selfExcludedUntil &&
      profile.selfExcludedUntil <= now
    ) {
      return db.playerProfile.update({
        where: { id: profile.id },
        data: { status: 'ACTIVE', selfExcludedUntil: null },
      });
    }
    return profile;
  }
}
