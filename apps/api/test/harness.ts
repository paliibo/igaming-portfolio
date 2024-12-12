import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma.service.js';
import { RedisService } from '../src/common/redis.provider.js';
import { AllExceptionsFilter } from '../src/common/http-exception.filter.js';
import { createRootLogger } from '../src/common/logger.js';
import { LedgerService } from '../src/modules/ledger/ledger.service.js';
import { UsersService } from '../src/modules/users/users.service.js';
import {
  RANDOM_SOURCE,
  type RandomSource,
  SeededRandomSource,
} from '../src/modules/casino/providers/random-source.js';
import { marketsFor } from '../src/modules/sportsbook/fixtures.js';
import { ENV, type Env } from '../src/config/env.js';

export interface TestContext {
  module: TestingModule;
  app: INestApplication;
  prisma: PrismaService;
  ledger: LedgerService;
  users: UsersService;
  env: Env;
  random: { current: RandomSource };
  close(): Promise<void>;
}

/** Boots the real application module against the test database with a swappable random source. */
export async function createTestContext(): Promise<TestContext> {
  const random = { current: new SeededRandomSource(42) as RandomSource };
  const randomProxy: RandomSource = { next: () => random.current.next() };
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(RANDOM_SOURCE)
    .useValue(randomProxy)
    .compile();
  const app = module.createNestApplication({ logger: false });
  const env = app.get<Env>(ENV);
  if (!env.isTest || !env.DATABASE_URL.includes('_test'))
    throw new Error(`refusing to run tests against ${env.DATABASE_URL}`);
  app.use(cookieParser());
  app.enableCors({ origin: env.corsOrigins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(
    new AllExceptionsFilter(createRootLogger(process.env['TEST_LOG_LEVEL'] ?? 'silent', false)),
  );
  await app.init();
  const prisma = app.get(PrismaService);
  const ledger = app.get(LedgerService);
  await resetDatabase(prisma);
  await ledger.ensureSystemAccounts();
  const redis = app.get(RedisService);
  const keys = await redis.client.keys('ratelimit:*');
  if (keys.length) await redis.client.del(keys);
  return {
    module,
    app,
    prisma,
    ledger,
    users: app.get(UsersService),
    env,
    random,
    close: async () => {
      await app.close();
    },
  };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.client.$queryRaw<
    { tablename: string }[]
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.client.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

let counter = 0;
export async function createPlayer(
  ctx: TestContext,
  overrides: { balanceMinor?: bigint; email?: string } = {},
) {
  counter += 1;
  return ctx.users.createUser({
    email: overrides.email ?? `player${counter}-${Date.now()}@test.local`,
    password: 'Player123!',
    displayName: `Player ${counter}`,
    role: 'PLAYER',
    welcomeBalanceMinor: overrides.balanceMinor ?? 100_000n,
  });
}

export async function createStaff(ctx: TestContext, role: 'OPERATOR' | 'ADMIN') {
  counter += 1;
  return ctx.users.createUser({
    email: `${role.toLowerCase()}${counter}-${Date.now()}@test.local`,
    password: 'Staff1234!',
    displayName: `${role} ${counter}`,
    role,
    welcomeBalanceMinor: 0n,
  });
}

export async function createEvent(
  ctx: TestContext,
  options: {
    sport?: 'football' | 'basketball';
    status?: 'SCHEDULED' | 'LIVE';
    startsInMinutes?: number;
  } = {},
) {
  const sportSlug = options.sport ?? 'football';
  const sport = await ctx.prisma.client.sport.upsert({
    where: { slug: sportSlug },
    update: {},
    create: { slug: sportSlug, name: sportSlug === 'football' ? 'Football' : 'Basketball' },
  });
  const home = 'Test Home';
  const away = 'Test Away';
  return ctx.prisma.client.sportsEvent.create({
    data: {
      sportId: sport.id,
      competition: 'Test League',
      homeTeam: home,
      awayTeam: away,
      startsAt: new Date(Date.now() + (options.startsInMinutes ?? 60) * 60_000),
      status: options.status ?? 'SCHEDULED',
      markets: {
        create: marketsFor(sportSlug, home, away, 'even').map((m, idx) => ({
          type: m.type,
          name: m.name,
          line: m.line,
          sortOrder: idx,
          selections: { create: m.selections.map((s, sIdx) => ({ ...s, sortOrder: sIdx })) },
        })),
      },
    },
    include: { markets: { include: { selections: true } } },
  });
}

export function selection(
  event: Awaited<ReturnType<typeof createEvent>>,
  type: string,
  outcomeKey: string,
) {
  const market = event.markets.find((m) => m.type === type);
  const sel = market?.selections.find((s) => s.outcomeKey === outcomeKey);
  if (!market || !sel) throw new Error(`selection ${type}/${outcomeKey} missing`);
  return { market, sel };
}

export async function createGames(ctx: TestContext) {
  const dice = await ctx.prisma.client.casinoGame.create({
    data: {
      slug: 'harbor-dice',
      name: 'Harbor Dice',
      providerKey: 'demo-studio',
      providerGameId: 'demo-dice',
      category: 'DICE',
      description: 'dice',
      volatility: 'Adjustable',
      theoreticalRtpLabel: '99 %',
      minStakeMinor: 100n,
      maxStakeMinor: 50_000n,
      maxWinMultiplier: 99,
      playable: true,
      artwork: {},
      tags: [],
    },
  });
  const slots = await ctx.prisma.client.casinoGame.create({
    data: {
      slug: 'harbor-reels',
      name: 'Harbor Reels',
      providerKey: 'demo-studio',
      providerGameId: 'demo-slots',
      category: 'SLOTS',
      description: 'slots',
      volatility: 'Medium',
      theoreticalRtpLabel: 'paytable',
      minStakeMinor: 50n,
      maxStakeMinor: 20_000n,
      maxWinMultiplier: 100,
      playable: true,
      artwork: {},
      tags: [],
    },
  });
  return { dice, slots };
}

export async function walletBalance(ctx: TestContext, userId: string): Promise<bigint> {
  const wallet = await ctx.prisma.client.wallet.findUniqueOrThrow({ where: { userId } });
  return wallet.balanceMinor;
}

export async function login(ctx: TestContext, email: string, password: string): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post('/api/auth/login')
    .set('Origin', 'http://localhost:3000')
    .send({ email, password })
    .expect(200);
  const cookie = (res.headers['set-cookie'] as unknown as string[] | undefined)?.[0];
  if (!cookie) throw new Error('no session cookie');
  return cookie.split(';')[0]!;
}

export async function expectLedgerConsistent(ctx: TestContext) {
  const report = await ctx.ledger.reconcile();
  if (!report.balanced) throw new Error(`ledger inconsistent: ${JSON.stringify(report)}`);
  return report;
}
