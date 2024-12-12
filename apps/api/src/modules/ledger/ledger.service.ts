import { Injectable } from '@nestjs/common';
import {
  type JournalEntry,
  type JournalEntryKind,
  type JournalLine,
  type LedgerAccountKind,
  type LineDirection,
  Prisma,
} from '@igaming/database';
import type { ReconciliationDto } from '@igaming/contracts';
import { PrismaService, type Tx } from '../../common/prisma.service.js';
import { DomainError, InsufficientFundsError } from '../../common/errors.js';

export interface PostingLine {
  accountId: string;
  direction: LineDirection;
  amountMinor: bigint;
}

export interface PostEntryInput {
  kind: JournalEntryKind;
  description: string;
  lines: PostingLine[];
  referenceType?: string;
  referenceId?: string;
  idempotencyKey?: string;
  metadata?: Prisma.InputJsonValue;
  createdById?: string;
  reversalOfId?: string;
}

export interface PostedEntry {
  entry: JournalEntry & { lines: JournalLine[] };
  /** Wallet balances after posting, keyed by wallet id. */
  walletBalances: Map<
    string,
    { walletId: string; userId: string; balanceMinor: bigint; transactionId: string }
  >;
}

interface LockedWallet {
  id: string;
  userId: string;
  accountId: string;
  balanceMinor: bigint;
}

export const SYSTEM_ACCOUNTS: Record<
  Exclude<LedgerAccountKind, 'PLAYER_WALLET'>,
  { code: string; name: string }
> = {
  HOUSE_FLOAT: { code: 'HOUSE_FLOAT', name: 'House float (demo credit issuance)' },
  SPORTSBOOK_REVENUE: { code: 'SPORTSBOOK_REVENUE', name: 'Sportsbook gross gaming revenue' },
  CASINO_REVENUE: { code: 'CASINO_REVENUE', name: 'Casino gross gaming revenue' },
  ADJUSTMENTS: { code: 'ADJUSTMENTS', name: 'Operator adjustments' },
};

/**
 * Double-entry journal. Every posting is validated to balance, is written atomically with the
 * caller's transaction, and keeps wallet rows consistent under a row lock. PostgreSQL is the only
 * source of truth for balances; the cached Wallet.balanceMinor is updated in the same transaction.
 */
@Injectable()
export class LedgerService {
  private readonly systemAccountIds = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async ensureSystemAccounts(): Promise<void> {
    for (const [kind, def] of Object.entries(SYSTEM_ACCOUNTS)) {
      const account = await this.prisma.client.ledgerAccount.upsert({
        where: { code: def.code },
        update: {},
        create: { code: def.code, name: def.name, kind: kind as LedgerAccountKind },
      });
      this.systemAccountIds.set(kind, account.id);
    }
  }

  async systemAccountId(kind: Exclude<LedgerAccountKind, 'PLAYER_WALLET'>): Promise<string> {
    const cached = this.systemAccountIds.get(kind);
    if (cached) return cached;
    await this.ensureSystemAccounts();
    const id = this.systemAccountIds.get(kind);
    if (!id) throw new Error(`system account ${kind} missing`);
    return id;
  }

  /** Locks the wallet row of a user for the remainder of the transaction (SELECT ... FOR UPDATE). */
  async lockWalletByUser(tx: Tx, userId: string): Promise<LockedWallet> {
    const rows = await tx.$queryRaw<LockedWallet[]>`
      SELECT id, "userId", "accountId", "balanceMinor" FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
    const wallet = rows[0];
    if (!wallet) throw new DomainError('WALLET_NOT_FOUND', 'Wallet not found for user', 404);
    return { ...wallet, balanceMinor: BigInt(wallet.balanceMinor) };
  }

  /**
   * Posts a balanced journal entry. Wallet lines debit/credit the player's balance; a debit that
   * would make a balance negative throws InsufficientFundsError and aborts the transaction.
   */
  async postEntry(tx: Tx, input: PostEntryInput): Promise<PostedEntry> {
    this.assertBalanced(input.lines);

    const entry = await tx.journalEntry.create({
      data: {
        kind: input.kind,
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        idempotencyKey: input.idempotencyKey,
        metadata: input.metadata,
        createdById: input.createdById,
        reversalOfId: input.reversalOfId,
        lines: {
          create: input.lines.map((l) => ({
            accountId: l.accountId,
            direction: l.direction,
            amountMinor: l.amountMinor,
          })),
        },
      },
      include: { lines: true },
    });

    const walletBalances = new Map<
      string,
      { walletId: string; userId: string; balanceMinor: bigint; transactionId: string }
    >();
    const accountIds = [...new Set(input.lines.map((l) => l.accountId))].sort();
    if (accountIds.length === 0) return { entry, walletBalances };

    const wallets = await tx.$queryRaw<LockedWallet[]>`
      SELECT id, "userId", "accountId", "balanceMinor" FROM "Wallet"
      WHERE "accountId" IN (${Prisma.join(accountIds)}) ORDER BY id FOR UPDATE`;

    for (const wallet of wallets) {
      const delta = input.lines
        .filter((l) => l.accountId === wallet.accountId)
        .reduce((acc, l) => acc + (l.direction === 'CREDIT' ? l.amountMinor : -l.amountMinor), 0n);
      const newBalance = BigInt(wallet.balanceMinor) + delta;
      if (newBalance < 0n) {
        throw new InsufficientFundsError({
          balanceMinor: wallet.balanceMinor.toString(),
          requiredMinor: (-delta).toString(),
        });
      }
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceMinor: newBalance, version: { increment: 1 } },
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          entryId: entry.id,
          kind: input.kind,
          amountMinor: delta,
          balanceAfterMinor: newBalance,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          description: input.description,
        },
      });
      walletBalances.set(wallet.id, {
        walletId: wallet.id,
        userId: wallet.userId,
        balanceMinor: newBalance,
        transactionId: transaction.id,
      });
    }

    return { entry, walletBalances };
  }

  /** Creates a reversing entry that mirrors every line of the original. */
  async reverseEntry(
    tx: Tx,
    entryId: string,
    reason: string,
    actorId: string,
  ): Promise<PostedEntry> {
    const original = await tx.journalEntry.findUnique({
      where: { id: entryId },
      include: { lines: true, reversedBy: true },
    });
    if (!original) throw new DomainError('NOT_FOUND', 'Journal entry not found', 404);
    if (original.reversedBy)
      throw new DomainError('ALREADY_REVERSED', 'Journal entry has already been reversed', 409);
    if (original.kind === 'REVERSAL')
      throw new DomainError(
        'CANNOT_REVERSE_REVERSAL',
        'A reversal entry cannot itself be reversed',
        409,
      );
    return this.postEntry(tx, {
      kind: 'REVERSAL',
      description: `Reversal of ${original.kind.toLowerCase().replace('_', ' ')}: ${reason}`,
      referenceType: original.referenceType ?? undefined,
      referenceId: original.referenceId ?? undefined,
      reversalOfId: original.id,
      createdById: actorId,
      metadata: { reason, originalEntryId: original.id, originalKind: original.kind },
      lines: original.lines.map((l) => ({
        accountId: l.accountId,
        direction: l.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
        amountMinor: l.amountMinor,
      })),
    });
  }

  /** Verifies every entry balances and every cached wallet balance equals its ledger balance. */
  async reconcile(): Promise<ReconciliationDto> {
    const unbalanced = await this.prisma.client.$queryRaw<{ entryId: string }[]>`
      SELECT "entryId" FROM "JournalLine"
      GROUP BY "entryId"
      HAVING COALESCE(SUM(CASE WHEN direction = 'DEBIT' THEN "amountMinor" ELSE 0 END), 0)
           <> COALESCE(SUM(CASE WHEN direction = 'CREDIT' THEN "amountMinor" ELSE 0 END), 0)`;
    const entriesChecked = await this.prisma.client.journalEntry.count();
    const mismatches = await this.prisma.client.$queryRaw<
      { walletId: string; cachedMinor: bigint; ledgerMinor: bigint }[]
    >`
      SELECT w.id AS "walletId", w."balanceMinor" AS "cachedMinor",
             COALESCE(SUM(CASE WHEN l.direction = 'CREDIT' THEN l."amountMinor" ELSE -l."amountMinor" END), 0) AS "ledgerMinor"
      FROM "Wallet" w
      LEFT JOIN "JournalLine" l ON l."accountId" = w."accountId"
      GROUP BY w.id, w."balanceMinor"
      HAVING w."balanceMinor" <> COALESCE(SUM(CASE WHEN l.direction = 'CREDIT' THEN l."amountMinor" ELSE -l."amountMinor" END), 0)`;
    const walletsChecked = await this.prisma.client.wallet.count();
    return {
      checkedAt: new Date().toISOString(),
      entriesChecked,
      unbalancedEntries: unbalanced.map((u) => u.entryId),
      walletsChecked,
      walletMismatches: mismatches.map((m) => ({
        walletId: m.walletId,
        cachedMinor: m.cachedMinor.toString(),
        ledgerMinor: m.ledgerMinor.toString(),
      })),
      balanced: unbalanced.length === 0 && mismatches.length === 0,
    };
  }

  private assertBalanced(lines: PostingLine[]): void {
    if (lines.length < 2)
      throw new DomainError('UNBALANCED_ENTRY', 'A journal entry needs at least two lines', 500);
    let debits = 0n;
    let credits = 0n;
    for (const line of lines) {
      if (line.amountMinor <= 0n)
        throw new DomainError('INVALID_AMOUNT', 'Journal line amounts must be positive', 500);
      if (line.direction === 'DEBIT') debits += line.amountMinor;
      else credits += line.amountMinor;
    }
    if (debits !== credits) {
      throw new DomainError(
        'UNBALANCED_ENTRY',
        `Journal entry does not balance (debits ${debits}, credits ${credits})`,
        500,
      );
    }
  }
}
