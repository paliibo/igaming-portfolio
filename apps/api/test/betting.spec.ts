import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createEvent,
  createPlayer,
  createStaff,
  createTestContext,
  expectLedgerConsistent,
  resetDatabase,
  selection,
  walletBalance,
  type TestContext,
} from './harness.js';
import { BettingService } from '../src/modules/sportsbook/betting.service.js';
import { SettlementService } from '../src/modules/sportsbook/settlement.service.js';
import { RiskService } from '../src/modules/risk/risk.service.js';
import {
  InsufficientFundsError,
  LimitExceededError,
  PlayerRestrictedError,
} from '../src/common/errors.js';

let keyCounter = 0;
const key = () => `bet-key-${Date.now()}-${++keyCounter}`;

describe('sportsbook betting lifecycle', () => {
  let ctx: TestContext;
  let betting: BettingService;
  let settlement: SettlementService;
  let risk: RiskService;

  beforeAll(async () => {
    ctx = await createTestContext();
    betting = ctx.app.get(BettingService);
    settlement = ctx.app.get(SettlementService);
    risk = ctx.app.get(RiskService);
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await ctx.ledger.ensureSystemAccounts();
  });
  afterAll(async () => ctx.close());

  it('acceptance: 1,000 credits → 20 @ 2.50 → 980 → win → 1,030 with an auditable ledger', async () => {
    const player = await createPlayer(ctx);
    const operator = await createStaff(ctx, 'OPERATOR');
    const event = await createEvent(ctx);
    const { sel } = selection(event, 'MATCH_WINNER', 'HOME');
    await ctx.prisma.client.marketSelection.update({
      where: { id: sel.id },
      data: { priceMilli: 2500 },
    });

    expect(await walletBalance(ctx, player.id)).toBe(100_000n);
    const placed = await betting.placeBet(player.id, {
      idempotencyKey: key(),
      stakeMinor: '2000',
      selections: [{ selectionId: sel.id, priceMilli: 2500 }],
      acceptPriceChanges: false,
    });
    expect(placed.bet.status).toBe('OPEN');
    expect(placed.bet.potentialPayoutMinor).toBe('5000');
    expect(placed.wallet.balanceMinor).toBe('98000');
    expect(await walletBalance(ctx, player.id)).toBe(98_000n);

    const summary = await settlement.settleEvent({
      eventId: event.id,
      homeScore: 2,
      awayScore: 0,
      requestedBy: operator.id,
    });
    expect(summary.betsWon).toBe(1);
    expect(summary.paidOutMinor).toBe('5000');
    expect(await walletBalance(ctx, player.id)).toBe(103_000n);

    const bet = await ctx.prisma.client.bet.findUniqueOrThrow({ where: { id: placed.bet.id } });
    expect(bet.status).toBe('WON');
    expect(bet.payoutMinor).toBe(5000n);
    const tx = await ctx.prisma.client.walletTransaction.findMany({
      where: { wallet: { userId: player.id } },
      orderBy: { createdAt: 'asc' },
    });
    expect(tx.map((t) => [t.kind, t.amountMinor, t.balanceAfterMinor])).toEqual([
      ['TOPUP', 100_000n, 100_000n],
      ['BET_STAKE', -2000n, 98_000n],
      ['BET_PAYOUT', 5000n, 103_000n],
    ]);
    const stakeEntry = await ctx.prisma.client.journalEntry.findUniqueOrThrow({
      where: { id: bet.stakeEntryId! },
      include: { lines: true },
    });
    expect(stakeEntry.referenceId).toBe(bet.id);
    expect(stakeEntry.lines).toHaveLength(2);
    await expectLedgerConsistent(ctx);
  });

  it('validates stakes on the backend', async () => {
    const player = await createPlayer(ctx);
    const event = await createEvent(ctx);
    const { sel } = selection(event, 'MATCH_WINNER', 'HOME');
    const base = {
      selections: [{ selectionId: sel.id, priceMilli: sel.priceMilli }],
      acceptPriceChanges: false,
    };
    await expect(
      betting.placeBet(player.id, { ...base, idempotencyKey: key(), stakeMinor: '50' }),
    ).rejects.toMatchObject({ code: 'STAKE_TOO_LOW' });
    await expect(
      betting.placeBet(player.id, { ...base, idempotencyKey: key(), stakeMinor: '600000' }),
    ).rejects.toMatchObject({ code: 'STAKE_TOO_HIGH' });
    expect(await walletBalance(ctx, player.id)).toBe(100_000n);
  });

  it('rejects bets on suspended or closed markets and on finished events', async () => {
    const player = await createPlayer(ctx);
    const event = await createEvent(ctx);
    const { market, sel } = selection(event, 'MATCH_WINNER', 'HOME');
    const input = {
      stakeMinor: '1000',
      selections: [{ selectionId: sel.id, priceMilli: sel.priceMilli }],
      acceptPriceChanges: false,
    };
    await ctx.prisma.client.bettingMarket.update({
      where: { id: market.id },
      data: { status: 'SUSPENDED' },
    });
    await expect(
      betting.placeBet(player.id, { ...input, idempotencyKey: key() }),
    ).rejects.toMatchObject({ code: 'MARKET_NOT_OPEN' });
    await ctx.prisma.client.bettingMarket.update({
      where: { id: market.id },
      data: { status: 'CLOSED' },
    });
    await expect(
      betting.placeBet(player.id, { ...input, idempotencyKey: key() }),
    ).rejects.toMatchObject({ code: 'MARKET_NOT_OPEN' });
    await ctx.prisma.client.bettingMarket.update({
      where: { id: market.id },
      data: { status: 'OPEN' },
    });
    await ctx.prisma.client.sportsEvent.update({
      where: { id: event.id },
      data: { status: 'FINISHED' },
    });
    await expect(
      betting.placeBet(player.id, { ...input, idempotencyKey: key() }),
    ).rejects.toMatchObject({ code: 'EVENT_NOT_BETTABLE' });
    expect(await walletBalance(ctx, player.id)).toBe(100_000n);
    expect(await ctx.prisma.client.bet.count()).toBe(0);
  });

  it('requires the player to accept changed odds and then prices the bet at the current odds', async () => {
    const player = await createPlayer(ctx);
    const event = await createEvent(ctx);
    const { sel } = selection(event, 'MATCH_WINNER', 'HOME');
    await ctx.prisma.client.marketSelection.update({
      where: { id: sel.id },
      data: { priceMilli: 2100 },
    });
    const stale = {
      stakeMinor: '1000',
      selections: [{ selectionId: sel.id, priceMilli: sel.priceMilli }],
      acceptPriceChanges: false,
    };
    await expect(
      betting.placeBet(player.id, { ...stale, idempotencyKey: key() }),
    ).rejects.toMatchObject({
      code: 'PRICE_CHANGED',
      details: {
        changes: [
          { selectionId: sel.id, submittedPriceMilli: sel.priceMilli, currentPriceMilli: 2100 },
        ],
      },
    });
    expect(await walletBalance(ctx, player.id)).toBe(100_000n);
    const accepted = await betting.placeBet(player.id, {
      ...stale,
      idempotencyKey: key(),
      acceptPriceChanges: true,
    });
    expect(accepted.bet.selections[0]!.priceMilli).toBe(2100);
    expect(accepted.bet.potentialPayoutMinor).toBe('2100');
  });

  it('replays the same idempotency key instead of placing a second bet', async () => {
    const player = await createPlayer(ctx);
    const event = await createEvent(ctx);
    const { sel } = selection(event, 'MATCH_WINNER', 'DRAW');
    const input = {
      idempotencyKey: 'same-key-123',
      stakeMinor: '1500',
      selections: [{ selectionId: sel.id, priceMilli: sel.priceMilli }],
      acceptPriceChanges: false,
    };
    const [a, b] = await Promise.all([
      betting.placeBet(player.id, input),
      betting.placeBet(player.id, input),
    ]);
    expect(a.bet.id).toBe(b.bet.id);
    expect([a.replayed, b.replayed].filter(Boolean)).toHaveLength(1);
    expect(await ctx.prisma.client.bet.count()).toBe(1);
    expect(await walletBalance(ctx, player.id)).toBe(98_500n);
  });

  it('marks losing bets settled without any further wallet movement', async () => {
    const player = await createPlayer(ctx);
    const event = await createEvent(ctx);
    const { sel } = selection(event, 'MATCH_WINNER', 'AWAY');
    const placed = await betting.placeBet(player.id, {
      idempotencyKey: key(),
      stakeMinor: '3000',
      selections: [{ selectionId: sel.id, priceMilli: sel.priceMilli }],
      acceptPriceChanges: false,
    });
    const summary = await settlement.settleEvent({
      eventId: event.id,
      homeScore: 1,
      awayScore: 0,
      requestedBy: 'test',
    });
    expect(summary.betsLost).toBe(1);
    expect(await walletBalance(ctx, player.id)).toBe(97_000n);
    const bet = await ctx.prisma.client.bet.findUniqueOrThrow({ where: { id: placed.bet.id } });
    expect(bet.status).toBe('LOST');
    expect(bet.payoutMinor).toBe(0n);
    expect(bet.settlementEntryId).toBeNull();
    expect(
      await ctx.prisma.client.walletTransaction.count({ where: { wallet: { userId: player.id } } }),
    ).toBe(2);
  });

  it('never pays a winning bet twice when settlement runs repeatedly or concurrently', async () => {
    const player = await createPlayer(ctx);
    const event = await createEvent(ctx);
    const { sel } = selection(event, 'TOTAL', 'OVER');
    const placed = await betting.placeBet(player.id, {
      idempotencyKey: key(),
      stakeMinor: '1000',
      selections: [{ selectionId: sel.id, priceMilli: sel.priceMilli }],
      acceptPriceChanges: false,
    });
    const job = { eventId: event.id, homeScore: 3, awayScore: 1, requestedBy: 'test' };
    await Promise.all([settlement.settleEvent(job), settlement.settleEvent(job)]);
    await settlement.settleEvent(job);
    const results = await Promise.all([
      settlement.settleBet(placed.bet.id, 'WON', 'test'),
      settlement.settleBet(placed.bet.id, 'WON', 'test'),
    ]);
    expect(results.every((r) => r === null)).toBe(true);
    const expectedPayout = (1000n * BigInt(sel.priceMilli)) / 1000n;
    expect(await walletBalance(ctx, player.id)).toBe(100_000n - 1000n + expectedPayout);
    expect(await ctx.prisma.client.journalEntry.count({ where: { kind: 'BET_PAYOUT' } })).toBe(1);
    await expectLedgerConsistent(ctx);
  });

  it('rejects bets the wallet cannot cover', async () => {
    const player = await createPlayer(ctx, { balanceMinor: 500n });
    const event = await createEvent(ctx);
    const { sel } = selection(event, 'MATCH_WINNER', 'HOME');
    await expect(
      betting.placeBet(player.id, {
        idempotencyKey: key(),
        stakeMinor: '1000',
        selections: [{ selectionId: sel.id, priceMilli: sel.priceMilli }],
        acceptPriceChanges: false,
      }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(await ctx.prisma.client.bet.count()).toBe(0);
    expect(await walletBalance(ctx, player.id)).toBe(500n);
  });

  it('enforces daily wager limits and self-exclusion on the backend', async () => {
    const player = await createPlayer(ctx);
    const admin = await createStaff(ctx, 'ADMIN');
    const event = await createEvent(ctx);
    const { sel } = selection(event, 'MATCH_WINNER', 'HOME');
    const input = () => ({
      idempotencyKey: key(),
      stakeMinor: '3000',
      selections: [{ selectionId: sel.id, priceMilli: sel.priceMilli }],
      acceptPriceChanges: false,
    });
    await risk.setLimit(player.id, 'DAILY_WAGER', 5000n, admin.id);
    await betting.placeBet(player.id, input());
    await expect(betting.placeBet(player.id, input())).rejects.toBeInstanceOf(LimitExceededError);
    await ctx.prisma.client.playerProfile.update({
      where: { userId: player.id },
      data: { status: 'SELF_EXCLUDED', selfExcludedUntil: new Date(Date.now() + 86_400_000) },
    });
    await expect(
      betting.placeBet(player.id, { ...input(), stakeMinor: '100' }),
    ).rejects.toBeInstanceOf(PlayerRestrictedError);
    expect(await walletBalance(ctx, player.id)).toBe(97_000n);
  });

  it('settles an accumulator at the product of its prices and refunds voided events', async () => {
    const player = await createPlayer(ctx);
    const first = await createEvent(ctx);
    const second = await createEvent(ctx, { sport: 'basketball' });
    const a = selection(first, 'MATCH_WINNER', 'HOME').sel;
    const b = selection(second, 'MATCH_WINNER', 'AWAY').sel;
    const placed = await betting.placeBet(player.id, {
      idempotencyKey: key(),
      stakeMinor: '1000',
      selections: [
        { selectionId: a.id, priceMilli: a.priceMilli },
        { selectionId: b.id, priceMilli: b.priceMilli },
      ],
      acceptPriceChanges: false,
    });
    const expected = (1000n * BigInt(a.priceMilli) * BigInt(b.priceMilli)) / 1_000_000n;
    expect(placed.bet.potentialPayoutMinor).toBe(expected.toString());
    await settlement.settleEvent({
      eventId: first.id,
      homeScore: 1,
      awayScore: 0,
      requestedBy: 'test',
    });
    expect(
      (await ctx.prisma.client.bet.findUniqueOrThrow({ where: { id: placed.bet.id } })).status,
    ).toBe('OPEN');
    await settlement.settleEvent({
      eventId: second.id,
      homeScore: 90,
      awayScore: 100,
      requestedBy: 'test',
    });
    expect(
      (await ctx.prisma.client.bet.findUniqueOrThrow({ where: { id: placed.bet.id } })).status,
    ).toBe('WON');
    expect(await walletBalance(ctx, player.id)).toBe(100_000n - 1000n + expected);

    const third = await createEvent(ctx);
    const c = selection(third, 'MATCH_WINNER', 'HOME').sel;
    const single = await betting.placeBet(player.id, {
      idempotencyKey: key(),
      stakeMinor: '700',
      selections: [{ selectionId: c.id, priceMilli: c.priceMilli }],
      acceptPriceChanges: false,
    });
    const before = await walletBalance(ctx, player.id);
    await settlement.cancelEvent(third.id, 'test');
    expect(
      (await ctx.prisma.client.bet.findUniqueOrThrow({ where: { id: single.bet.id } })).status,
    ).toBe('VOID');
    expect(await walletBalance(ctx, player.id)).toBe(before + 700n);
    await expectLedgerConsistent(ctx);
  });
});
