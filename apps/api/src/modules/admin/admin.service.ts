import { Injectable } from '@nestjs/common';
import type {
  AdminPlayerDetailDto,
  AdminPlayerListItemDto,
  AuditLogDto,
  BetDto,
  DashboardMetricsDto,
  GameRoundDto,
  JournalEntryDto,
  LedgerAccountDto,
  Page,
  ReportRowDto,
  ReportsDto,
  RiskAlertDto,
  WalletTransactionDto,
} from '@igaming/contracts';
import {
  type BetStatus,
  type JournalEntryKind,
  type KycStatus,
  type PlayerStatus,
  Prisma,
  type RiskAlert,
  type RiskAlertStatus,
  type User,
} from '@igaming/database';
import { PrismaService } from '../../common/prisma.service.js';
import { NotFoundError } from '../../common/errors.js';
import { cursorArgs, toPage } from '../../common/pagination.js';
import { toProfileDto } from '../users/users.service.js';
import { toTransactionDto, toWalletDto } from '../wallet/wallet.service.js';
import { toBetDto, betInclude } from '../sportsbook/betting.service.js';
import { roundInclude, toRoundDto } from '../casino/casino.service.js';
import { toAuditDto } from '../audit/audit.service.js';
import { RiskService } from '../risk/risk.service.js';
import { RedisService } from '../../common/redis.provider.js';

type PlayerRef = Pick<User, 'id' | 'email' | 'displayName'>;
const DASHBOARD_CACHE_KEY = 'admin:dashboard:v1';
const DASHBOARD_CACHE_TTL_SECONDS = 10;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly risk: RiskService,
    private readonly redis: RedisService,
  ) {}

  // ---------- players ----------

  async listPlayers(query: {
    search?: string;
    status?: PlayerStatus;
    kycStatus?: KycStatus;
    cursor?: string;
    limit: number;
  }): Promise<Page<AdminPlayerListItemDto>> {
    const rows = await this.prisma.client.user.findMany({
      where: {
        role: 'PLAYER',
        ...(query.search
          ? {
              OR: [
                { email: { contains: query.search, mode: 'insensitive' } },
                { displayName: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.status || query.kycStatus
          ? {
              profile: {
                ...(query.status ? { status: query.status } : {}),
                ...(query.kycStatus ? { kycStatus: query.kycStatus } : {}),
              },
            }
          : {}),
      },
      include: {
        profile: true,
        wallet: true,
        _count: { select: { riskAlerts: { where: { status: 'OPEN' } } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(query.cursor, query.limit),
    });
    const page = toPage(rows, query.limit);
    return {
      items: page.items.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        profile: toProfileDto(u.profile!),
        balanceMinor: (u.wallet?.balanceMinor ?? 0n).toString(),
        openAlerts: u._count.riskAlerts,
      })),
      nextCursor: page.nextCursor,
    };
  }

  async getPlayer(id: string): Promise<AdminPlayerDetailDto> {
    const user = await this.prisma.client.user.findUnique({
      where: { id },
      include: {
        profile: true,
        wallet: true,
        adminNotes: {
          include: { author: { select: { id: true, displayName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        riskAlerts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { user: { select: { id: true, email: true, displayName: true } } },
        },
      },
    });
    if (!user || !user.profile || !user.wallet) throw new NotFoundError('Player', id);
    const [limits, stats] = await Promise.all([this.risk.listLimits(id), this.playerStats(id)]);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      profile: toProfileDto(user.profile),
      balanceMinor: user.wallet.balanceMinor.toString(),
      openAlerts: user.riskAlerts.filter((a) => a.status === 'OPEN').length,
      wallet: toWalletDto(user.wallet),
      limits,
      notes: user.adminNotes.map((n) => ({
        id: n.id,
        body: n.body,
        author: n.author,
        createdAt: n.createdAt.toISOString(),
      })),
      alerts: user.riskAlerts.map(toAlertDto),
      stats,
    };
  }

  private async playerStats(userId: string) {
    const [betCount, roundCount, sums] = await Promise.all([
      this.prisma.client.bet.count({ where: { userId } }),
      this.prisma.client.gameRound.count({ where: { userId } }),
      this.prisma.client.$queryRaw<{ kind: string; total: bigint }[]>`
        SELECT t.kind, COALESCE(SUM(ABS(t."amountMinor")), 0)::bigint AS total
        FROM "WalletTransaction" t JOIN "Wallet" w ON w.id = t."walletId"
        WHERE w."userId" = ${userId} GROUP BY t.kind`,
    ]);
    const by = new Map(sums.map((s) => [s.kind, BigInt(s.total)]));
    const g = (k: string) => by.get(k) ?? 0n;
    return {
      betCount,
      roundCount,
      totalStakedMinor: (g('BET_STAKE') + g('CASINO_STAKE')).toString(),
      totalWonMinor: (g('BET_PAYOUT') + g('CASINO_PAYOUT')).toString(),
      totalToppedUpMinor: g('TOPUP').toString(),
    };
  }

  async updatePlayerStatus(
    id: string,
    input: { status: PlayerStatus; reason: string; days?: number },
  ) {
    const profile = await this.prisma.client.playerProfile.findUnique({ where: { userId: id } });
    if (!profile) throw new NotFoundError('Player', id);
    const until = input.days ? new Date(Date.now() + input.days * 86_400_000) : null;
    const updated = await this.prisma.client.playerProfile.update({
      where: { userId: id },
      data: {
        status: input.status,
        suspendedReason: input.status === 'ACTIVE' ? null : input.reason,
        selfExcludedUntil: input.status === 'SELF_EXCLUDED' ? until : null,
        coolingOffUntil:
          input.status === 'COOLING_OFF' ? (until ?? new Date(Date.now() + 86_400_000)) : null,
      },
    });
    return toProfileDto(updated);
  }

  async updateKyc(id: string, kycStatus: KycStatus) {
    const profile = await this.prisma.client.playerProfile.findUnique({ where: { userId: id } });
    if (!profile) throw new NotFoundError('Player', id);
    return toProfileDto(
      await this.prisma.client.playerProfile.update({ where: { userId: id }, data: { kycStatus } }),
    );
  }

  async addNote(userId: string, authorId: string, body: string) {
    const note = await this.prisma.client.adminNote.create({
      data: { userId, authorId, body },
      include: { author: { select: { id: true, displayName: true } } },
    });
    return {
      id: note.id,
      body: note.body,
      author: note.author,
      createdAt: note.createdAt.toISOString(),
    };
  }

  // ---------- ledger views ----------

  async listTransactions(query: {
    playerId?: string;
    kind?: string;
    referenceId?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit: number;
  }): Promise<Page<WalletTransactionDto & { player: PlayerRef }>> {
    const rows = await this.prisma.client.walletTransaction.findMany({
      where: {
        ...(query.playerId ? { wallet: { userId: query.playerId } } : {}),
        ...(query.kind ? { kind: query.kind as JournalEntryKind } : {}),
        ...(query.referenceId ? { referenceId: query.referenceId } : {}),
        ...dateRange(query),
      },
      include: {
        wallet: { include: { user: { select: { id: true, email: true, displayName: true } } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(query.cursor, query.limit),
    });
    const page = toPage(rows, query.limit);
    return {
      items: page.items.map((t) => ({ ...toTransactionDto(t), player: t.wallet.user })),
      nextCursor: page.nextCursor,
    };
  }

  async listJournal(query: {
    kind?: string;
    referenceId?: string;
    playerId?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit: number;
  }): Promise<Page<JournalEntryDto>> {
    const rows = await this.prisma.client.journalEntry.findMany({
      where: {
        ...(query.kind ? { kind: query.kind as JournalEntryKind } : {}),
        ...(query.referenceId ? { referenceId: query.referenceId } : {}),
        ...(query.playerId
          ? { transactions: { some: { wallet: { userId: query.playerId } } } }
          : {}),
        ...dateRange(query),
      },
      include: journalInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(query.cursor, query.limit),
    });
    const page = toPage(rows, query.limit);
    return { items: page.items.map(toJournalDto), nextCursor: page.nextCursor };
  }

  async getJournalEntry(id: string): Promise<JournalEntryDto> {
    const entry = await this.prisma.client.journalEntry.findUnique({
      where: { id },
      include: journalInclude,
    });
    if (!entry) throw new NotFoundError('Journal entry', id);
    return toJournalDto(entry);
  }

  async ledgerAccounts(): Promise<LedgerAccountDto[]> {
    const rows = await this.prisma.client.$queryRaw<
      {
        id: string;
        code: string;
        name: string;
        kind: LedgerAccountDto['kind'];
        debit: bigint;
        credit: bigint;
      }[]
    >`
      SELECT a.id, a.code, a.name, a.kind,
        COALESCE(SUM(CASE WHEN l.direction = 'DEBIT' THEN l."amountMinor" ELSE 0 END), 0)::bigint AS debit,
        COALESCE(SUM(CASE WHEN l.direction = 'CREDIT' THEN l."amountMinor" ELSE 0 END), 0)::bigint AS credit
      FROM "LedgerAccount" a LEFT JOIN "JournalLine" l ON l."accountId" = a.id
      WHERE a.kind <> 'PLAYER_WALLET'
      GROUP BY a.id ORDER BY a.code`;
    const wallets = await this.prisma.client.$queryRaw<
      { debit: bigint; credit: bigint; count: bigint }[]
    >`
      SELECT COALESCE(SUM(CASE WHEN l.direction = 'DEBIT' THEN l."amountMinor" ELSE 0 END), 0)::bigint AS debit,
             COALESCE(SUM(CASE WHEN l.direction = 'CREDIT' THEN l."amountMinor" ELSE 0 END), 0)::bigint AS credit,
             COUNT(DISTINCT a.id)::bigint AS count
      FROM "LedgerAccount" a LEFT JOIN "JournalLine" l ON l."accountId" = a.id WHERE a.kind = 'PLAYER_WALLET'`;
    const w = wallets[0] ?? { debit: 0n, credit: 0n, count: 0n };
    const accounts: LedgerAccountDto[] = rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      kind: r.kind,
      debitTotalMinor: r.debit.toString(),
      creditTotalMinor: r.credit.toString(),
      balanceMinor: (r.kind === 'HOUSE_FLOAT' || r.kind === 'ADJUSTMENTS'
        ? BigInt(r.debit) - BigInt(r.credit)
        : BigInt(r.credit) - BigInt(r.debit)
      ).toString(),
    }));
    accounts.unshift({
      id: 'player-wallets',
      code: 'PLAYER_WALLETS',
      name: `All player wallets (${w.count} accounts)`,
      kind: 'PLAYER_WALLET',
      debitTotalMinor: w.debit.toString(),
      creditTotalMinor: w.credit.toString(),
      balanceMinor: (BigInt(w.credit) - BigInt(w.debit)).toString(),
    });
    return accounts;
  }

  // ---------- activity ----------

  async listBets(query: {
    playerId?: string;
    eventId?: string;
    status?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit: number;
  }): Promise<Page<BetDto>> {
    const rows = await this.prisma.client.bet.findMany({
      where: {
        ...(query.playerId ? { userId: query.playerId } : {}),
        ...(query.status ? { status: query.status as BetStatus } : {}),
        ...(query.eventId
          ? { selections: { some: { selection: { market: { eventId: query.eventId } } } } }
          : {}),
        ...(query.from || query.to
          ? {
              placedAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      include: betInclude,
      orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(query.cursor, query.limit),
    });
    const page = toPage(rows, query.limit);
    return { items: page.items.map(toBetDto), nextCursor: page.nextCursor };
  }

  async listRounds(query: {
    playerId?: string;
    gameId?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit: number;
  }): Promise<Page<GameRoundDto>> {
    const rows = await this.prisma.client.gameRound.findMany({
      where: {
        ...(query.playerId ? { userId: query.playerId } : {}),
        ...(query.gameId ? { gameId: query.gameId } : {}),
        ...dateRange(query),
      },
      include: roundInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(query.cursor, query.limit),
    });
    const page = toPage(rows, query.limit);
    return { items: page.items.map(toRoundDto), nextCursor: page.nextCursor };
  }

  async listAlerts(query: {
    status?: RiskAlertStatus;
    playerId?: string;
    cursor?: string;
    limit: number;
  }): Promise<Page<RiskAlertDto>> {
    const rows = await this.prisma.client.riskAlert.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.playerId ? { userId: query.playerId } : {}),
      },
      include: { user: { select: { id: true, email: true, displayName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(query.cursor, query.limit),
    });
    const page = toPage(rows, query.limit);
    return { items: page.items.map(toAlertDto), nextCursor: page.nextCursor };
  }

  async updateAlert(
    id: string,
    status: 'RESOLVED' | 'DISMISSED',
    actorId: string,
  ): Promise<RiskAlertDto> {
    const alert = await this.prisma.client.riskAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundError('Alert', id);
    const updated = await this.prisma.client.riskAlert.update({
      where: { id },
      data: { status, resolvedById: actorId, resolvedAt: new Date() },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    });
    return toAlertDto(updated);
  }

  async listAudit(query: {
    action?: string;
    actorId?: string;
    targetId?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit: number;
  }): Promise<Page<AuditLogDto>> {
    const rows = await this.prisma.client.auditLog.findMany({
      where: {
        ...(query.action ? { action: { startsWith: query.action } } : {}),
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.targetId ? { targetId: query.targetId } : {}),
        ...dateRange(query),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(query.cursor, query.limit),
    });
    const page = toPage(rows, query.limit);
    return { items: page.items.map(toAuditDto), nextCursor: page.nextCursor };
  }

  // ---------- metrics & reports ----------

  async dashboard(): Promise<DashboardMetricsDto> {
    const cached = await this.redis.client.get(DASHBOARD_CACHE_KEY).catch(() => null);
    if (cached) return JSON.parse(cached) as DashboardMetricsDto;
    const [
      players,
      circulation,
      kindTotals,
      betCounts,
      roundCount,
      openAlerts,
      recentTx,
      recentAlerts,
      activity,
    ] = await Promise.all([
      this.prisma.client.playerProfile.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { user: { role: 'PLAYER' } },
      }),
      this.prisma.client.wallet.aggregate({ _sum: { balanceMinor: true } }),
      this.prisma.client.$queryRaw<
        { kind: string; total: bigint }[]
      >`SELECT kind, COALESCE(SUM(ABS("amountMinor")), 0)::bigint AS total FROM "WalletTransaction" GROUP BY kind`,
      this.prisma.client.bet.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.client.gameRound.count(),
      this.prisma.client.riskAlert.count({ where: { status: 'OPEN' } }),
      this.prisma.client.walletTransaction.findMany({
        take: 12,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: { include: { user: { select: { id: true, email: true, displayName: true } } } },
        },
      }),
      this.prisma.client.riskAlert.findMany({
        where: { status: 'OPEN' },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, displayName: true } } },
      }),
      this.prisma.client.$queryRaw<{ day: Date; kind: string; total: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, kind, COALESCE(SUM(ABS("amountMinor")), 0)::bigint AS total
        FROM "WalletTransaction" WHERE "createdAt" >= NOW() - INTERVAL '13 days' AND kind IN ('BET_STAKE','CASINO_STAKE','TOPUP')
        GROUP BY day, kind ORDER BY day`,
    ]);
    const by = new Map(kindTotals.map((k) => [k.kind, BigInt(k.total)]));
    const g = (k: string) => by.get(k) ?? 0n;
    const count = (s: string) => players.find((p) => p.status === s)?._count._all ?? 0;
    const totalPlayers = players.reduce((acc, p) => acc + p._count._all, 0);
    const betTotal = betCounts.reduce((acc, b) => acc + b._count._all, 0);
    const days = [...Array(14).keys()].map((i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - (13 - i));
      return d.toISOString().slice(0, 10);
    });
    const activityMap = new Map<string, { sports: bigint; casino: bigint; topup: bigint }>(
      days.map((d) => [d, { sports: 0n, casino: 0n, topup: 0n }]),
    );
    for (const row of activity) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      const bucket = activityMap.get(key);
      if (!bucket) continue;
      if (row.kind === 'BET_STAKE') bucket.sports += BigInt(row.total);
      if (row.kind === 'CASINO_STAKE') bucket.casino += BigInt(row.total);
      if (row.kind === 'TOPUP') bucket.topup += BigInt(row.total);
    }
    const dto: DashboardMetricsDto = {
      generatedAt: new Date().toISOString(),
      players: {
        total: totalPlayers,
        active: count('ACTIVE'),
        selfExcluded: count('SELF_EXCLUDED'),
        suspended: count('SUSPENDED'),
      },
      creditsInCirculationMinor: (circulation._sum.balanceMinor ?? 0n).toString(),
      topupsTotalMinor: g('TOPUP').toString(),
      sportsbook: {
        betCount: betTotal,
        openBetCount: betCounts.find((b) => b.status === 'OPEN')?._count._all ?? 0,
        stakedMinor: g('BET_STAKE').toString(),
        paidOutMinor: (g('BET_PAYOUT') + g('BET_REFUND')).toString(),
        grossRevenueMinor: (g('BET_STAKE') - g('BET_PAYOUT') - g('BET_REFUND')).toString(),
      },
      casino: {
        roundCount,
        stakedMinor: g('CASINO_STAKE').toString(),
        paidOutMinor: g('CASINO_PAYOUT').toString(),
        grossRevenueMinor: (g('CASINO_STAKE') - g('CASINO_PAYOUT')).toString(),
      },
      openAlerts,
      recentTransactions: recentTx.map((t) => ({ ...toTransactionDto(t), player: t.wallet.user })),
      recentAlerts: recentAlerts.map(toAlertDto),
      activity: days.map((day) => {
        const b = activityMap.get(day)!;
        return {
          day,
          sportsStakeMinor: b.sports.toString(),
          casinoStakeMinor: b.casino.toString(),
          topupMinor: b.topup.toString(),
        };
      }),
    };
    await this.redis.client
      .set(DASHBOARD_CACHE_KEY, JSON.stringify(dto), 'EX', DASHBOARD_CACHE_TTL_SECONDS)
      .catch(() => undefined);
    return dto;
  }

  async reports(days: number): Promise<ReportsDto> {
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - (days - 1));
    const [rows, bets, rounds] = await Promise.all([
      this.prisma.client.$queryRaw<{ day: Date; kind: string; total: bigint }[]>`
        SELECT date_trunc('day', "createdAt") AS day, kind, COALESCE(SUM("amountMinor"), 0)::bigint AS total
        FROM "WalletTransaction" WHERE "createdAt" >= ${from} GROUP BY day, kind ORDER BY day`,
      this.prisma.client.$queryRaw<
        { day: Date; count: bigint }[]
      >`SELECT date_trunc('day', "placedAt") AS day, COUNT(*)::bigint AS count FROM "Bet" WHERE "placedAt" >= ${from} GROUP BY day`,
      this.prisma.client.$queryRaw<
        { day: Date; count: bigint }[]
      >`SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count FROM "GameRound" WHERE "createdAt" >= ${from} GROUP BY day`,
    ]);
    const dayKeys = [...Array(days).keys()].map((i) => {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const buckets = new Map<string, Record<string, bigint>>(dayKeys.map((d) => [d, {}]));
    for (const r of rows) {
      const key = new Date(r.day).toISOString().slice(0, 10);
      const b = buckets.get(key);
      if (b) b[r.kind] = (b[r.kind] ?? 0n) + BigInt(r.total);
    }
    const countBy = (list: { day: Date; count: bigint }[]) =>
      new Map(list.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)]));
    const betBy = countBy(bets);
    const roundBy = countBy(rounds);
    const abs = (v: bigint) => (v < 0n ? -v : v);
    const result: ReportRowDto[] = dayKeys.map((day) => {
      const b = buckets.get(day) ?? {};
      const g = (k: string) => b[k] ?? 0n;
      const topups = g('TOPUP');
      const sportsStake = abs(g('BET_STAKE'));
      const sportsPayout = g('BET_PAYOUT') + g('BET_REFUND');
      const casinoStake = abs(g('CASINO_STAKE'));
      const casinoPayout = g('CASINO_PAYOUT');
      const adjustments = g('ADJUSTMENT_CREDIT') + g('ADJUSTMENT_DEBIT') + g('REVERSAL');
      return {
        day,
        topupsMinor: topups.toString(),
        sportsStakeMinor: sportsStake.toString(),
        sportsPayoutMinor: sportsPayout.toString(),
        casinoStakeMinor: casinoStake.toString(),
        casinoPayoutMinor: casinoPayout.toString(),
        adjustmentsNetMinor: adjustments.toString(),
        grossGamingRevenueMinor: (
          sportsStake -
          sportsPayout +
          casinoStake -
          casinoPayout
        ).toString(),
        betCount: betBy.get(day) ?? 0,
        roundCount: roundBy.get(day) ?? 0,
      };
    });
    const sum = (k: keyof Omit<ReportRowDto, 'day' | 'betCount' | 'roundCount'>) =>
      result.reduce((acc, r) => acc + BigInt(r[k]), 0n).toString();
    return {
      from: from.toISOString(),
      to: new Date().toISOString(),
      rows: result,
      totals: {
        topupsMinor: sum('topupsMinor'),
        sportsStakeMinor: sum('sportsStakeMinor'),
        sportsPayoutMinor: sum('sportsPayoutMinor'),
        casinoStakeMinor: sum('casinoStakeMinor'),
        casinoPayoutMinor: sum('casinoPayoutMinor'),
        adjustmentsNetMinor: sum('adjustmentsNetMinor'),
        grossGamingRevenueMinor: sum('grossGamingRevenueMinor'),
        betCount: result.reduce((acc, r) => acc + r.betCount, 0),
        roundCount: result.reduce((acc, r) => acc + r.roundCount, 0),
      },
      definitions: {
        topups: 'Sum of TOPUP wallet credits (welcome balances and demo top-ups).',
        sportsStake: 'Sum of BET_STAKE wallet debits, counted when the bet is placed.',
        sportsPayout: 'Sum of BET_PAYOUT and BET_REFUND wallet credits, counted when settled.',
        casinoStake: 'Sum of CASINO_STAKE wallet debits.',
        casinoPayout: 'Sum of CASINO_PAYOUT wallet credits.',
        adjustmentsNet:
          'Net effect on player wallets of manual adjustments and reversals (positive = credited to players).',
        grossGamingRevenue:
          'Stakes minus payouts across sportsbook and casino, on a cash (settlement date) basis. Open bets are included in stake but not yet in payout.',
      },
    };
  }
}

const journalInclude = {
  lines: { include: { account: true } },
  reversedBy: { select: { id: true } },
  transactions: {
    include: {
      wallet: { include: { user: { select: { id: true, email: true, displayName: true } } } },
    },
    take: 1,
  },
} satisfies Prisma.JournalEntryInclude;

type JournalRow = Prisma.JournalEntryGetPayload<{ include: typeof journalInclude }>;

function toJournalDto(e: JournalRow): JournalEntryDto {
  return {
    id: e.id,
    kind: e.kind,
    description: e.description,
    referenceType: e.referenceType,
    referenceId: e.referenceId,
    idempotencyKey: e.idempotencyKey,
    metadata: (e.metadata as Record<string, unknown> | null) ?? null,
    createdById: e.createdById,
    reversalOfId: e.reversalOfId,
    reversedById: e.reversedBy?.id ?? null,
    createdAt: e.createdAt.toISOString(),
    lines: e.lines.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      accountCode: l.account.code,
      accountName: l.account.name,
      accountKind: l.account.kind,
      direction: l.direction,
      amountMinor: l.amountMinor.toString(),
    })),
    player: e.transactions[0]?.wallet.user ?? null,
  };
}

export function toAlertDto(a: RiskAlert & { user: PlayerRef }): RiskAlertDto {
  return {
    id: a.id,
    type: a.type,
    severity: a.severity,
    status: a.status,
    message: a.message,
    metadata: (a.metadata as Record<string, unknown> | null) ?? null,
    createdAt: a.createdAt.toISOString(),
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
    player: a.user,
  };
}

function dateRange(q: { from?: string; to?: string }) {
  if (!q.from && !q.to) return {};
  return {
    createdAt: {
      ...(q.from ? { gte: new Date(q.from) } : {}),
      ...(q.to ? { lte: new Date(q.to) } : {}),
    },
  };
}
