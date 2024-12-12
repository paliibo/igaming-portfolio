import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createGames,
  createPlayer,
  createStaff,
  createTestContext,
  expectLedgerConsistent,
  resetDatabase,
  walletBalance,
  type TestContext,
} from './harness.js';
import { CasinoService } from '../src/modules/casino/casino.service.js';
import { RiskService } from '../src/modules/risk/risk.service.js';
import { ScriptedRandomSource } from '../src/modules/casino/providers/random-source.js';
import {
  InsufficientFundsError,
  LimitExceededError,
  PlayerRestrictedError,
} from '../src/common/errors.js';

let n = 0;
const roundKey = () => `round-key-${Date.now()}-${++n}`;

describe('casino rounds', () => {
  let ctx: TestContext;
  let casino: CasinoService;
  let risk: RiskService;

  beforeAll(async () => {
    ctx = await createTestContext();
    casino = ctx.app.get(CasinoService);
    risk = ctx.app.get(RiskService);
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await ctx.ledger.ensureSystemAccounts();
    await createGames(ctx);
  });
  afterAll(async () => ctx.close());

  it('debits the stake once, credits a deterministic win once, and records both ledger entries', async () => {
    const player = await createPlayer(ctx);
    ctx.random.current = new ScriptedRandomSource([0.25]);
    const session = await casino.createSession(player.id, 'harbor-dice');
    const result = await casino.playRound(player.id, {
      sessionId: session.id,
      clientRoundKey: roundKey(),
      stakeMinor: '1000',
      input: { type: 'dice', target: 50, direction: 'under' },
    });
    expect(result.round.outcome).toMatchObject({
      type: 'dice',
      roll: 25,
      win: true,
      multiplierMilli: 1980,
    });
    expect(result.round.payoutMinor).toBe('1980');
    expect(result.wallet.balanceMinor).toBe('100980');
    expect(await walletBalance(ctx, player.id)).toBe(100_980n);
    const kinds = (
      await ctx.prisma.client.walletTransaction.findMany({
        where: { wallet: { userId: player.id } },
        orderBy: { createdAt: 'asc' },
      })
    ).map((t) => t.kind);
    expect(kinds).toEqual(['TOPUP', 'CASINO_STAKE', 'CASINO_PAYOUT']);
    expect(result.round.stakeEntryId).toBeTruthy();
    expect(result.round.payoutEntryId).toBeTruthy();
    await expectLedgerConsistent(ctx);
  });

  it('records a losing round with only the stake debit', async () => {
    const player = await createPlayer(ctx);
    ctx.random.current = new ScriptedRandomSource([0.95]);
    const session = await casino.createSession(player.id, 'harbor-dice');
    const result = await casino.playRound(player.id, {
      sessionId: session.id,
      clientRoundKey: roundKey(),
      stakeMinor: '1000',
      input: { type: 'dice', target: 50, direction: 'under' },
    });
    expect(result.round.outcome).toMatchObject({ win: false });
    expect(result.round.payoutMinor).toBe('0');
    expect(result.round.payoutEntryId).toBeNull();
    expect(await walletBalance(ctx, player.id)).toBe(99_000n);
  });

  it('replays a completed round for the same client key instead of paying twice (sequential and concurrent)', async () => {
    const player = await createPlayer(ctx);
    ctx.random.current = new ScriptedRandomSource([0.999, 0.999, 0.999]);
    const session = await casino.createSession(player.id, 'harbor-reels');
    const input = {
      sessionId: session.id,
      clientRoundKey: 'slots-jackpot-key',
      stakeMinor: '200',
      input: { type: 'slots' as const },
    };
    const first = await casino.playRound(player.id, input);
    expect(first.round.outcome).toMatchObject({
      reels: ['crown', 'crown', 'crown'],
      multiplier: 100,
    });
    expect(await walletBalance(ctx, player.id)).toBe(100_000n - 200n + 20_000n);
    const replay = await casino.playRound(player.id, input);
    expect(replay.replayed).toBe(true);
    expect(replay.round.id).toBe(first.round.id);
    expect(await walletBalance(ctx, player.id)).toBe(119_800n);

    const concurrentKey = { ...input, clientRoundKey: 'slots-concurrent-key' };
    const results = await Promise.all([
      casino.playRound(player.id, concurrentKey),
      casino.playRound(player.id, concurrentKey),
      casino.playRound(player.id, concurrentKey),
    ]);
    expect(new Set(results.map((r) => r.round.id)).size).toBe(1);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(await ctx.prisma.client.gameRound.count()).toBe(2);
    await expectLedgerConsistent(ctx);
  });

  it('rejects rounds the wallet cannot cover and stakes outside the game range', async () => {
    const player = await createPlayer(ctx, { balanceMinor: 300n });
    const session = await casino.createSession(player.id, 'harbor-dice');
    await expect(
      casino.playRound(player.id, {
        sessionId: session.id,
        clientRoundKey: roundKey(),
        stakeMinor: '500',
        input: { type: 'dice', target: 50, direction: 'under' },
      }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
    await expect(
      casino.playRound(player.id, {
        sessionId: session.id,
        clientRoundKey: roundKey(),
        stakeMinor: '50',
        input: { type: 'dice', target: 50, direction: 'under' },
      }),
    ).rejects.toMatchObject({ code: 'STAKE_OUT_OF_RANGE' });
    expect(await ctx.prisma.client.gameRound.count()).toBe(0);
    expect(await walletBalance(ctx, player.id)).toBe(300n);
  });

  it('enforces player limits and self-exclusion before any stake moves', async () => {
    const player = await createPlayer(ctx);
    const admin = await createStaff(ctx, 'ADMIN');
    await risk.setLimit(player.id, 'DAILY_WAGER', 1500n, admin.id);
    const session = await casino.createSession(player.id, 'harbor-dice');
    const play = (stake: string) =>
      casino.playRound(player.id, {
        sessionId: session.id,
        clientRoundKey: roundKey(),
        stakeMinor: stake,
        input: { type: 'dice', target: 50, direction: 'under' },
      });
    await play('1000');
    await expect(play('1000')).rejects.toBeInstanceOf(LimitExceededError);
    await ctx.prisma.client.playerProfile.update({
      where: { userId: player.id },
      data: { status: 'SELF_EXCLUDED', selfExcludedUntil: new Date(Date.now() + 86_400_000) },
    });
    await expect(play('100')).rejects.toBeInstanceOf(PlayerRestrictedError);
    await expect(casino.createSession(player.id, 'harbor-dice')).resolves.toBeDefined();
    const alerts = await ctx.prisma.client.riskAlert.findMany({ where: { userId: player.id } });
    expect(alerts.some((a) => a.type === 'LIMIT_BREACH_ATTEMPT')).toBe(true);
  });

  it('refuses rounds on closed sessions and sessions for non-playable or maintenance games', async () => {
    const player = await createPlayer(ctx);
    const session = await casino.createSession(player.id, 'harbor-dice');
    await casino.closeSession(player.id, session.id);
    await expect(
      casino.playRound(player.id, {
        sessionId: session.id,
        clientRoundKey: roundKey(),
        stakeMinor: '100',
        input: { type: 'dice', target: 50, direction: 'under' },
      }),
    ).rejects.toMatchObject({ code: 'SESSION_CLOSED' });
    await ctx.prisma.client.casinoGame.create({
      data: {
        slug: 'showcase',
        name: 'Showcase',
        providerKey: 'demo-studio',
        providerGameId: 'showcase-x',
        category: 'TABLE',
        description: 'x',
        volatility: 'Low',
        theoreticalRtpLabel: 'x',
        minStakeMinor: 100n,
        maxStakeMinor: 1000n,
        maxWinMultiplier: 10,
        playable: false,
        artwork: {},
        tags: [],
      },
    });
    await expect(casino.createSession(player.id, 'showcase')).rejects.toMatchObject({
      code: 'GAME_NOT_PLAYABLE',
    });
    await ctx.prisma.client.casinoGame.update({
      where: { slug: 'harbor-reels' },
      data: { status: 'MAINTENANCE' },
    });
    await expect(casino.createSession(player.id, 'harbor-reels')).rejects.toMatchObject({
      code: 'GAME_IN_MAINTENANCE',
    });
  });
});
