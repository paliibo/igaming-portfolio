import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@igaming/database';
import { ENV, type Env } from '../../config/env.js';
import { PrismaService } from '../../common/prisma.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { UsersService } from '../users/users.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import { BettingService } from '../sportsbook/betting.service.js';
import { SettlementService } from '../sportsbook/settlement.service.js';
import { CasinoService } from '../casino/casino.service.js';
import { RiskService } from '../risk/risk.service.js';
import { AuditService } from '../audit/audit.service.js';
import { SPORTS, marketsFor } from '../sportsbook/fixtures.js';
import { DEMO_PROVIDER_KEY } from '../casino/providers/demo/demo-provider.adapter.js';

export interface SeedSummary {
  users: number;
  events: number;
  games: number;
  bets: number;
  rounds: number;
  seededAt: string;
}

const GAME_CATALOGUE: Omit<Prisma.CasinoGameCreateInput, 'artwork'>[] &
  { artwork: Prisma.InputJsonValue }[] = [
  {
    slug: 'harbor-dice',
    name: 'Harbor Dice',
    providerKey: DEMO_PROVIDER_KEY,
    providerGameId: 'demo-dice',
    category: 'DICE',
    description:
      'Set your target, choose under or over, and roll. Transparent multipliers derived from a fixed 1 % edge.',
    volatility: 'Adjustable',
    theoreticalRtpLabel: '99 % (by construction)',
    minStakeMinor: 100n,
    maxStakeMinor: 50_000n,
    maxWinMultiplier: 99,
    featured: true,
    playable: true,
    tags: ['dice', 'instant', 'provably simple'],
    sortOrder: 1,
    artwork: { gradientFrom: '#3b1d6e', gradientTo: '#7c3aed', accent: '#fbbf24', symbol: 'dice' },
  },
  {
    slug: 'harbor-reels',
    name: 'Harbor Reels',
    providerKey: DEMO_PROVIDER_KEY,
    providerGameId: 'demo-slots',
    category: 'SLOTS',
    description:
      'Three weighted reels, six nautical symbols and a published paytable topped by the Harbor Crown jackpot.',
    volatility: 'Medium',
    theoreticalRtpLabel: 'Published paytable',
    minStakeMinor: 50n,
    maxStakeMinor: 20_000n,
    maxWinMultiplier: 100,
    featured: true,
    playable: true,
    tags: ['slots', 'reels', 'jackpot'],
    sortOrder: 2,
    artwork: { gradientFrom: '#1e1b4b', gradientTo: '#6d28d9', accent: '#f59e0b', symbol: 'reels' },
  },
  {
    slug: 'neptunes-fortune',
    name: "Neptune's Fortune",
    providerKey: DEMO_PROVIDER_KEY,
    providerGameId: 'showcase-neptune',
    category: 'SLOTS',
    description:
      'Five-reel showcase title with cascading wins. Listed to demonstrate catalogue management; not playable in the demo.',
    volatility: 'High',
    theoreticalRtpLabel: 'Showcase',
    minStakeMinor: 100n,
    maxStakeMinor: 10_000n,
    maxWinMultiplier: 5000,
    featured: true,
    playable: false,
    tags: ['slots', 'cascade'],
    sortOrder: 3,
    artwork: {
      gradientFrom: '#0f172a',
      gradientTo: '#1d4ed8',
      accent: '#38bdf8',
      symbol: 'trident',
    },
  },
  {
    slug: 'blackjack-classic',
    name: 'Blackjack Classic',
    providerKey: DEMO_PROVIDER_KEY,
    providerGameId: 'showcase-blackjack',
    category: 'TABLE',
    description: 'Single-deck blackjack showcase entry.',
    volatility: 'Low',
    theoreticalRtpLabel: 'Showcase',
    minStakeMinor: 500n,
    maxStakeMinor: 100_000n,
    maxWinMultiplier: 3,
    featured: false,
    playable: false,
    tags: ['table', 'cards'],
    sortOrder: 4,
    artwork: { gradientFrom: '#14532d', gradientTo: '#166534', accent: '#fde68a', symbol: 'cards' },
  },
  {
    slug: 'roulette-royale',
    name: 'Roulette Royale',
    providerKey: DEMO_PROVIDER_KEY,
    providerGameId: 'showcase-roulette',
    category: 'TABLE',
    description: 'European roulette showcase entry.',
    volatility: 'Medium',
    theoreticalRtpLabel: 'Showcase',
    minStakeMinor: 100n,
    maxStakeMinor: 50_000n,
    maxWinMultiplier: 36,
    featured: false,
    playable: false,
    tags: ['table', 'wheel'],
    sortOrder: 5,
    artwork: { gradientFrom: '#7f1d1d', gradientTo: '#991b1b', accent: '#fcd34d', symbol: 'wheel' },
  },
  {
    slug: 'lucky-ladder',
    name: 'Lucky Ladder',
    providerKey: DEMO_PROVIDER_KEY,
    providerGameId: 'showcase-ladder',
    category: 'INSTANT',
    description: 'Climb the ladder and cash out before it breaks. Showcase entry.',
    volatility: 'High',
    theoreticalRtpLabel: 'Showcase',
    minStakeMinor: 100n,
    maxStakeMinor: 10_000n,
    maxWinMultiplier: 500,
    featured: false,
    playable: false,
    tags: ['instant', 'ladder'],
    sortOrder: 6,
    artwork: {
      gradientFrom: '#312e81',
      gradientTo: '#4338ca',
      accent: '#a5b4fc',
      symbol: 'ladder',
    },
  },
  {
    slug: 'crash-harbor',
    name: 'Crash Harbor',
    providerKey: DEMO_PROVIDER_KEY,
    providerGameId: 'showcase-crash',
    category: 'INSTANT',
    description: 'Multiplier curve crash game showcase entry.',
    volatility: 'Very high',
    theoreticalRtpLabel: 'Showcase',
    minStakeMinor: 100n,
    maxStakeMinor: 20_000n,
    maxWinMultiplier: 1000,
    featured: false,
    playable: false,
    tags: ['instant', 'crash'],
    sortOrder: 7,
    artwork: {
      gradientFrom: '#4c1d95',
      gradientTo: '#be185d',
      accent: '#f9a8d4',
      symbol: 'rocket',
    },
  },
  {
    slug: 'baccarat-lounge',
    name: 'Baccarat Lounge',
    providerKey: DEMO_PROVIDER_KEY,
    providerGameId: 'showcase-baccarat',
    category: 'TABLE',
    description:
      'Punto banco showcase entry, currently in maintenance to demonstrate catalogue states.',
    volatility: 'Low',
    theoreticalRtpLabel: 'Showcase',
    minStakeMinor: 1000n,
    maxStakeMinor: 200_000n,
    maxWinMultiplier: 9,
    featured: false,
    playable: false,
    status: 'MAINTENANCE',
    tags: ['table', 'cards'],
    sortOrder: 8,
    artwork: { gradientFrom: '#1c1917', gradientTo: '#44403c', accent: '#d6d3d1', symbol: 'cards' },
  },
];

/** Seeds internally consistent demo data by running the real services, never by inserting ledger rows directly. */
@Injectable()
export class DemoDataService {
  private readonly logger = new Logger(DemoDataService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly users: UsersService,
    private readonly wallet: WalletService,
    private readonly betting: BettingService,
    private readonly settlement: SettlementService,
    private readonly casino: CasinoService,
    private readonly risk: RiskService,
    private readonly audit: AuditService,
  ) {}

  async isSeeded(): Promise<boolean> {
    return (await this.prisma.client.user.count()) > 0;
  }

  async reset(): Promise<SeedSummary> {
    const tables = await this.prisma.client.$queryRaw<
      { tablename: string }[]
    >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    const list = tables.map((t) => `"${t.tablename}"`).join(', ');
    await this.prisma.client.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    return this.seed();
  }

  async seed(): Promise<SeedSummary> {
    await this.ledger.ensureSystemAccounts();
    const admin = await this.users.createUser({
      email: this.env.DEMO_ADMIN_EMAIL,
      password: this.env.DEMO_ADMIN_PASSWORD,
      displayName: 'Demo Admin',
      role: 'ADMIN',
      kycVerified: true,
    });
    const operator = await this.users.createUser({
      email: this.env.DEMO_OPERATOR_EMAIL,
      password: this.env.DEMO_OPERATOR_PASSWORD,
      displayName: 'Demo Operator',
      role: 'OPERATOR',
      kycVerified: true,
    });
    const player = await this.users.createUser({
      email: this.env.DEMO_PLAYER_EMAIL,
      password: this.env.DEMO_PLAYER_PASSWORD,
      displayName: 'Demo Player',
      role: 'PLAYER',
      kycVerified: true,
    });

    const extras = [];
    const extraDefs = [
      { email: 'ava.morgan@demo.local', displayName: 'Ava Morgan', kycVerified: true },
      { email: 'liam.chen@demo.local', displayName: 'Liam Chen', kycVerified: true },
      { email: 'noah.petrov@demo.local', displayName: 'Noah Petrov', kycVerified: false },
      { email: 'mia.santos@demo.local', displayName: 'Mia Santos', kycVerified: true },
      { email: 'ethan.kowalski@demo.local', displayName: 'Ethan Kowalski', kycVerified: false },
    ];
    for (const def of extraDefs)
      extras.push(await this.users.createUser({ ...def, password: 'Player123!', role: 'PLAYER' }));

    // Sports, events and markets
    const sports = new Map<string, string>();
    for (const s of SPORTS)
      sports.set(s.slug, (await this.prisma.client.sport.create({ data: s })).id);
    const now = Date.now();
    const minutes = (m: number) => new Date(now + m * 60_000);
    const fixtures = [
      {
        sport: 'football',
        competition: 'Demo Premier League',
        home: 'Northgate United',
        away: 'Riverside Athletic',
        startsAt: minutes(-27),
        live: { clock: 27, home: 1, away: 0, label: '1H' },
        featured: true,
        favourite: 'home' as const,
      },
      {
        sport: 'football',
        competition: 'Demo Cup',
        home: 'Harbour City FC',
        away: 'Ironbridge Rovers',
        startsAt: minutes(3),
        featured: true,
        favourite: 'even' as const,
      },
      {
        sport: 'basketball',
        competition: 'Demo Pro League',
        home: 'Metro Comets',
        away: 'Bayfront Titans',
        startsAt: minutes(-15),
        live: { clock: 15, home: 34, away: 29, label: 'Q2' },
        featured: true,
        favourite: 'home' as const,
      },
      {
        sport: 'basketball',
        competition: 'Demo Continental Cup',
        home: 'Summit Hawks',
        away: 'Granite Peaks',
        startsAt: minutes(45),
        featured: false,
        favourite: 'away' as const,
      },
      {
        sport: 'football',
        competition: 'Demo Championship',
        home: 'Silverlake Town',
        away: 'Oakmont Wanderers',
        startsAt: minutes(120),
        featured: false,
        favourite: 'away' as const,
      },
      {
        sport: 'football',
        competition: 'Demo Premier League',
        home: 'Eastmoor FC',
        away: 'Westbrook Albion',
        startsAt: minutes(240),
        featured: false,
        favourite: 'even' as const,
      },
    ];
    const eventIds: string[] = [];
    for (const f of fixtures) {
      const event = await this.prisma.client.sportsEvent.create({
        data: {
          sportId: sports.get(f.sport)!,
          competition: f.competition,
          homeTeam: f.home,
          awayTeam: f.away,
          startsAt: f.startsAt,
          featured: f.featured,
          ...(f.live
            ? {
                status: 'LIVE',
                clockMinute: f.live.clock,
                homeScore: f.live.home,
                awayScore: f.live.away,
                periodLabel: f.live.label,
              }
            : {}),
          markets: {
            create: marketsFor(f.sport, f.home, f.away, f.favourite).map((m, idx) => ({
              type: m.type,
              name: m.name,
              line: m.line,
              sortOrder: idx,
              selections: { create: m.selections.map((s, sIdx) => ({ ...s, sortOrder: sIdx })) },
            })),
          },
        },
      });
      eventIds.push(event.id);
    }

    // A completed fixture with real bets, settled through the settlement service
    const pastEvent = await this.prisma.client.sportsEvent.create({
      data: {
        sportId: sports.get('football')!,
        competition: 'Demo Premier League',
        homeTeam: 'Kingsport City',
        awayTeam: 'Fenwick Rangers',
        startsAt: minutes(-60 * 26),
        status: 'LIVE',
        clockMinute: 88,
        homeScore: 2,
        awayScore: 1,
        periodLabel: '2H',
        markets: {
          create: marketsFor('football', 'Kingsport City', 'Fenwick Rangers', 'home').map(
            (m, idx) => ({
              type: m.type,
              name: m.name,
              line: m.line,
              sortOrder: idx,
              selections: { create: m.selections.map((s, sIdx) => ({ ...s, sortOrder: sIdx })) },
            }),
          ),
        },
      },
      include: { markets: { include: { selections: true } } },
    });
    const pick = (type: string, key: string) =>
      pastEvent.markets.find((m) => m.type === type)!.selections.find((s) => s.outcomeKey === key)!;
    let bets = 0;
    const betPlan: [number, string, string, string][] = [
      [0, 'MATCH_WINNER', 'HOME', '5000'],
      [1, 'TOTAL', 'OVER', '2500'],
      [2, 'MATCH_WINNER', 'AWAY', '1500'],
      [3, 'BOTH_TEAMS_TO_SCORE', 'YES', '25000'],
      [4, 'HANDICAP', 'AWAY', '2000'],
      [1, 'MATCH_WINNER', 'DRAW', '1000'],
    ];
    for (const [idx, type, key, stake] of betPlan) {
      const sel = pick(type, key);
      await this.betting.placeBet(extras[idx]!.id, {
        idempotencyKey: `seed-bet-${idx}-${type}-${key}`,
        stakeMinor: stake,
        selections: [{ selectionId: sel.id, priceMilli: sel.priceMilli }],
        acceptPriceChanges: true,
      });
      bets += 1;
    }
    await this.settlement.settleEvent({
      eventId: pastEvent.id,
      homeScore: 2,
      awayScore: 1,
      requestedBy: operator.id,
    });

    // Live-event open bets so the operator view has pending liabilities
    const liveEvent = await this.prisma.client.sportsEvent.findUniqueOrThrow({
      where: { id: eventIds[0]! },
      include: { markets: { include: { selections: true } } },
    });
    const liveSel = liveEvent.markets
      .find((m) => m.type === 'MATCH_WINNER')!
      .selections.find((s) => s.outcomeKey === 'HOME')!;
    await this.betting.placeBet(extras[0]!.id, {
      idempotencyKey: 'seed-open-bet-0',
      stakeMinor: '3000',
      selections: [{ selectionId: liveSel.id, priceMilli: liveSel.priceMilli }],
      acceptPriceChanges: true,
    });
    const liveSel2 = liveEvent.markets
      .find((m) => m.type === 'TOTAL')!
      .selections.find((s) => s.outcomeKey === 'UNDER')!;
    await this.betting.placeBet(extras[3]!.id, {
      idempotencyKey: 'seed-open-bet-3',
      stakeMinor: '1200',
      selections: [{ selectionId: liveSel2.id, priceMilli: liveSel2.priceMilli }],
      acceptPriceChanges: true,
    });
    bets += 2;

    // Casino catalogue and some history
    for (const game of GAME_CATALOGUE) await this.prisma.client.casinoGame.create({ data: game });
    let rounds = 0;
    const roundPlan: [number, 'harbor-dice' | 'harbor-reels', number][] = [
      [0, 'harbor-dice', 6],
      [1, 'harbor-reels', 8],
      [2, 'harbor-dice', 4],
      [3, 'harbor-reels', 5],
      [4, 'harbor-dice', 3],
    ];
    for (const [idx, slug, count] of roundPlan) {
      const session = await this.casino.createSession(extras[idx]!.id, slug);
      for (let i = 0; i < count; i += 1) {
        await this.casino.playRound(extras[idx]!.id, {
          sessionId: session.id,
          clientRoundKey: `seed-round-${idx}-${slug}-${i}`,
          stakeMinor: slug === 'harbor-dice' ? '500' : '200',
          input:
            slug === 'harbor-dice'
              ? { type: 'dice', target: 50 + i * 5, direction: i % 2 === 0 ? 'under' : 'over' }
              : { type: 'slots' },
        });
        rounds += 1;
      }
      await this.casino.closeSession(extras[idx]!.id, session.id);
    }

    // Top-ups, limits, statuses, KYC states and alerts
    await this.wallet.topUp(extras[1]!.id, '50000', `seed-topup-${randomUUID()}`);
    await this.wallet.topUp(extras[3]!.id, '20000', `seed-topup-${randomUUID()}`);
    await this.risk.setLimit(extras[0]!.id, 'DAILY_WAGER', 50_000n, admin.id);
    await this.risk.setLimit(extras[0]!.id, 'DAILY_TOPUP', 100_000n, admin.id);
    await this.risk.setLimit(extras[2]!.id, 'DAILY_LOSS', 20_000n, admin.id);
    await this.prisma.client.playerProfile.update({
      where: { userId: extras[4]!.id },
      data: {
        status: 'SELF_EXCLUDED',
        selfExcludedUntil: new Date(now + 30 * 86_400_000),
        suspendedReason: 'Self-exclusion requested by player (30 days)',
      },
    });
    await this.prisma.client.playerProfile.update({
      where: { userId: extras[2]!.id },
      data: { kycStatus: 'REJECTED' },
    });
    await this.prisma.client.adminNote.create({
      data: {
        userId: extras[2]!.id,
        authorId: operator.id,
        body: 'KYC documents rejected: identity document expired. Player asked to resubmit.',
      },
    });
    await this.prisma.client.adminNote.create({
      data: {
        userId: extras[4]!.id,
        authorId: operator.id,
        body: 'Self-exclusion applied at player request via support chat.',
      },
    });
    await this.risk.raiseAlert({
      userId: extras[2]!.id,
      type: 'MANUAL',
      severity: 'MEDIUM',
      message: 'Manual review requested after rejected KYC and repeated top-up attempts',
      metadata: { source: 'seed' },
    });
    await this.audit.record({
      actorId: admin.id,
      actorEmail: admin.email,
      action: 'demo.seed',
      targetType: 'SYSTEM',
      metadata: { users: extras.length + 3 },
    });
    await this.audit.record({
      actorId: operator.id,
      actorEmail: operator.email,
      action: 'player.status.self_excluded',
      targetType: 'PLAYER',
      targetId: extras[4]!.id,
      metadata: { days: 30, reason: 'Self-exclusion requested by player' },
    });
    await this.audit.record({
      actorId: operator.id,
      actorEmail: operator.email,
      action: 'player.kyc',
      targetType: 'PLAYER',
      targetId: extras[2]!.id,
      metadata: { kycStatus: 'REJECTED' },
    });
    await this.audit.record({
      actorId: operator.id,
      actorEmail: operator.email,
      action: 'event.settle',
      targetType: 'EVENT',
      targetId: pastEvent.id,
      metadata: { homeScore: 2, awayScore: 1 },
    });

    await this.backdateHistory(
      extras.map((e) => e.id),
      pastEvent.id,
    );

    const summary: SeedSummary = {
      users: extras.length + 3,
      events: eventIds.length + 1,
      games: GAME_CATALOGUE.length,
      bets,
      rounds,
      seededAt: new Date().toISOString(),
    };
    this.logger.log(`seeded demo data: ${JSON.stringify(summary)}`);
    void player;
    return summary;
  }

  /**
   * Spreads the extra players' activity over the previous ten days so reports and charts have
   * history. Only timestamps move; amounts and journal balances are untouched.
   */
  private async backdateHistory(userIds: string[], pastEventId: string): Promise<void> {
    const shiftFor = (idx: number) => `${2 + idx * 2} days`;
    for (const [idx, userId] of userIds.entries()) {
      const shift = shiftFor(idx);
      await this.prisma.client.$executeRawUnsafe(
        `UPDATE "JournalEntry" e SET "createdAt" = e."createdAt" - INTERVAL '${shift}'
         WHERE e.id IN (SELECT t."entryId" FROM "WalletTransaction" t JOIN "Wallet" w ON w.id = t."walletId" WHERE w."userId" = $1)
           AND e.kind <> 'TOPUP'`,
        userId,
      );
      await this.prisma.client.$executeRawUnsafe(
        `UPDATE "WalletTransaction" t SET "createdAt" = t."createdAt" - INTERVAL '${shift}'
         FROM "Wallet" w WHERE w.id = t."walletId" AND w."userId" = $1 AND t.kind <> 'TOPUP'`,
        userId,
      );
      await this.prisma.client.$executeRawUnsafe(
        `UPDATE "GameRound" SET "createdAt" = "createdAt" - INTERVAL '${shift}', "completedAt" = "completedAt" - INTERVAL '${shift}' WHERE "userId" = $1`,
        userId,
      );
      await this.prisma.client.$executeRawUnsafe(
        `UPDATE "Bet" b SET "placedAt" = b."placedAt" - INTERVAL '${shift}', "settledAt" = b."settledAt" - INTERVAL '${shift}'
         WHERE b."userId" = $1 AND b.status <> 'OPEN'`,
        userId,
      );
    }
    await this.prisma.client.$executeRawUnsafe(
      `UPDATE "SportsEvent" SET status = 'SETTLED', "settledAt" = "startsAt" + INTERVAL '2 hours' WHERE id = $1`,
      pastEventId,
    );
  }
}
