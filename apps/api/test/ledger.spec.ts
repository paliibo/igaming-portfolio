import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createPlayer,
  createStaff,
  createTestContext,
  expectLedgerConsistent,
  resetDatabase,
  walletBalance,
  type TestContext,
} from './harness.js';
import { WalletService } from '../src/modules/wallet/wallet.service.js';
import { RiskService } from '../src/modules/risk/risk.service.js';
import { InsufficientFundsError, LimitExceededError } from '../src/common/errors.js';

describe('ledger & wallet', () => {
  let ctx: TestContext;
  let wallet: WalletService;
  let risk: RiskService;

  beforeAll(async () => {
    ctx = await createTestContext();
    wallet = ctx.app.get(WalletService);
    risk = ctx.app.get(RiskService);
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    await ctx.ledger.ensureSystemAccounts();
  });
  afterAll(async () => ctx.close());

  it('posts the welcome balance as a balanced double-entry journal', async () => {
    const player = await createPlayer(ctx);
    expect(await walletBalance(ctx, player.id)).toBe(100_000n);
    const entries = await ctx.prisma.client.journalEntry.findMany({ include: { lines: true } });
    expect(entries).toHaveLength(1);
    const lines = entries[0]!.lines;
    const debits = lines
      .filter((l) => l.direction === 'DEBIT')
      .reduce((a, l) => a + l.amountMinor, 0n);
    const credits = lines
      .filter((l) => l.direction === 'CREDIT')
      .reduce((a, l) => a + l.amountMinor, 0n);
    expect(debits).toBe(credits);
    const report = await expectLedgerConsistent(ctx);
    expect(report.entriesChecked).toBe(1);
  });

  it('rejects unbalanced postings before touching any wallet', async () => {
    const player = await createPlayer(ctx);
    const houseFloat = await ctx.ledger.systemAccountId('HOUSE_FLOAT');
    const w = await ctx.prisma.client.wallet.findUniqueOrThrow({ where: { userId: player.id } });
    await expect(
      ctx.prisma.client.$transaction((tx) =>
        ctx.ledger.postEntry(tx, {
          kind: 'ADJUSTMENT_CREDIT',
          description: 'broken',
          lines: [
            { accountId: houseFloat, direction: 'DEBIT', amountMinor: 500n },
            { accountId: w.accountId, direction: 'CREDIT', amountMinor: 400n },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'UNBALANCED_ENTRY' });
    expect(await walletBalance(ctx, player.id)).toBe(100_000n);
    expect(await ctx.prisma.client.journalEntry.count()).toBe(1);
  });

  it('refuses a debit that would make the balance negative and rolls back the entry', async () => {
    const player = await createPlayer(ctx, { balanceMinor: 1000n });
    const revenue = await ctx.ledger.systemAccountId('CASINO_REVENUE');
    const w = await ctx.prisma.client.wallet.findUniqueOrThrow({ where: { userId: player.id } });
    await expect(
      ctx.prisma.client.$transaction(async (tx) => {
        await ctx.ledger.lockWalletByUser(tx, player.id);
        return ctx.ledger.postEntry(tx, {
          kind: 'CASINO_STAKE',
          description: 'too much',
          lines: [
            { accountId: w.accountId, direction: 'DEBIT', amountMinor: 1001n },
            { accountId: revenue, direction: 'CREDIT', amountMinor: 1001n },
          ],
        });
      }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
    expect(await walletBalance(ctx, player.id)).toBe(1000n);
    expect(await ctx.prisma.client.journalEntry.count({ where: { kind: 'CASINO_STAKE' } })).toBe(0);
    await expectLedgerConsistent(ctx);
  });

  it('serialises concurrent debits so a 1,000 balance pays exactly three 300 stakes', async () => {
    const player = await createPlayer(ctx, { balanceMinor: 1000n });
    const revenue = await ctx.ledger.systemAccountId('CASINO_REVENUE');
    const w = await ctx.prisma.client.wallet.findUniqueOrThrow({ where: { userId: player.id } });
    const attempts = Array.from({ length: 10 }, (_, i) =>
      ctx.prisma.client
        .$transaction(async (tx) => {
          await ctx.ledger.lockWalletByUser(tx, player.id);
          return ctx.ledger.postEntry(tx, {
            kind: 'CASINO_STAKE',
            description: `concurrent ${i}`,
            lines: [
              { accountId: w.accountId, direction: 'DEBIT', amountMinor: 300n },
              { accountId: revenue, direction: 'CREDIT', amountMinor: 300n },
            ],
          });
        })
        .then(() => 'ok' as const)
        .catch((e: unknown) =>
          e instanceof InsufficientFundsError ? ('insufficient' as const) : Promise.reject(e),
        ),
    );
    const results = await Promise.all(attempts);
    expect(results.filter((r) => r === 'ok')).toHaveLength(3);
    expect(results.filter((r) => r === 'insufficient')).toHaveLength(7);
    expect(await walletBalance(ctx, player.id)).toBe(100n);
    await expectLedgerConsistent(ctx);
  });

  it('replays an idempotent top-up without posting twice', async () => {
    const player = await createPlayer(ctx);
    const first = await wallet.topUp(player.id, '5000', 'topup-key-0001');
    const second = await wallet.topUp(player.id, '5000', 'topup-key-0001');
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.wallet.balanceMinor).toBe('105000');
    expect(await walletBalance(ctx, player.id)).toBe(105_000n);
    expect(await ctx.prisma.client.journalEntry.count({ where: { kind: 'TOPUP' } })).toBe(2);
    await expect(wallet.topUp(player.id, '9999', 'topup-key-0001')).rejects.toMatchObject({
      code: 'IDEMPOTENCY_MISMATCH',
    });
  });

  it('enforces the daily top-up limit', async () => {
    const player = await createPlayer(ctx);
    const admin = await createStaff(ctx, 'ADMIN');
    await risk.setLimit(player.id, 'DAILY_TOPUP', 10_000n, admin.id);
    await wallet.topUp(player.id, '8000', 'limit-topup-1');
    await expect(wallet.topUp(player.id, '3000', 'limit-topup-2')).rejects.toBeInstanceOf(
      LimitExceededError,
    );
    expect(await walletBalance(ctx, player.id)).toBe(108_000n);
  });

  it('reverses an adjustment with a mirrored entry and refuses to reverse twice', async () => {
    const player = await createPlayer(ctx);
    const admin = await createStaff(ctx, 'ADMIN');
    const adj = await wallet.adjust({
      userId: player.id,
      direction: 'CREDIT',
      amountMinor: '2500',
      reason: 'goodwill',
      idempotencyKey: 'adj-0001',
      actorId: admin.id,
    });
    expect(await walletBalance(ctx, player.id)).toBe(102_500n);
    const reversal = await wallet.reverseEntry(
      adj.transaction.entryId,
      'posted in error',
      admin.id,
    );
    expect(await walletBalance(ctx, player.id)).toBe(100_000n);
    const entry = await ctx.prisma.client.journalEntry.findUniqueOrThrow({
      where: { id: reversal.entryId },
      include: { lines: true },
    });
    expect(entry.kind).toBe('REVERSAL');
    expect(entry.reversalOfId).toBe(adj.transaction.entryId);
    await expect(
      wallet.reverseEntry(adj.transaction.entryId, 'again', admin.id),
    ).rejects.toMatchObject({ code: 'ALREADY_REVERSED' });
    await expect(
      wallet.reverseEntry(reversal.entryId, 'reverse the reversal', admin.id),
    ).rejects.toMatchObject({ code: 'CANNOT_REVERSE_REVERSAL' });
    await expectLedgerConsistent(ctx);
  });

  it('keeps the reconciliation report honest when a wallet is tampered with', async () => {
    const player = await createPlayer(ctx);
    await ctx.prisma.client.wallet.update({
      where: { userId: player.id },
      data: { balanceMinor: 999_999n },
    });
    const report = await ctx.ledger.reconcile();
    expect(report.balanced).toBe(false);
    expect(report.walletMismatches).toHaveLength(1);
  });
});
