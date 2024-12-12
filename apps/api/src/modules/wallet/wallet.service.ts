import { Injectable, Inject, forwardRef } from '@nestjs/common';
import type { Page, WalletDto, WalletTransactionDto, TopupResponse } from '@igaming/contracts';
import {
  type JournalEntryKind,
  Prisma,
  type Wallet,
  type WalletTransaction,
} from '@igaming/database';
import { PrismaService, type Tx } from '../../common/prisma.service.js';
import { DomainError, NotFoundError } from '../../common/errors.js';
import { toBigInt } from '../../common/money.js';
import { cursorArgs, toPage } from '../../common/pagination.js';
import { LedgerService, type PostedEntry } from '../ledger/ledger.service.js';
import { RiskService } from '../risk/risk.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { IdempotencyService } from './idempotency.service.js';

export const MAX_TOPUP_MINOR = 1_000_000n; // 10,000 credits per request

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly idempotency: IdempotencyService,
    @Inject(forwardRef(() => RiskService)) private readonly risk: RiskService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async createWalletForUser(tx: Tx, userId: string): Promise<Wallet> {
    const account = await tx.ledgerAccount.create({
      data: { code: `WALLET:${userId}`, name: `Player wallet ${userId}`, kind: 'PLAYER_WALLET' },
    });
    return tx.wallet.create({ data: { userId, accountId: account.id } });
  }

  async getWallet(userId: string): Promise<WalletDto> {
    const wallet = await this.prisma.client.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet');
    return toWalletDto(wallet);
  }

  async listTransactions(
    userId: string,
    query: { cursor?: string; limit: number; kind?: string },
  ): Promise<Page<WalletTransactionDto>> {
    const wallet = await this.prisma.client.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet');
    const rows = await this.prisma.client.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
        ...(query.kind ? { kind: query.kind as JournalEntryKind } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(query.cursor, query.limit),
    });
    const page = toPage(rows, query.limit);
    return { items: page.items.map(toTransactionDto), nextCursor: page.nextCursor };
  }

  /** Demo-only virtual top-up: HOUSE_FLOAT → player wallet, subject to the daily top-up limit. */
  async topUp(
    userId: string,
    amountMinorInput: string,
    idempotencyKey: string,
    actorId?: string,
  ): Promise<TopupResponse & { replayed: boolean }> {
    const amountMinor = toBigInt(amountMinorInput);
    if (amountMinor > MAX_TOPUP_MINOR)
      throw new DomainError('TOPUP_TOO_LARGE', 'Maximum demo top-up is 10,000 credits per request');
    const { result, replayed } = await this.idempotency.run(
      {
        scope: 'wallet.topup',
        key: idempotencyKey,
        userId,
        payload: { userId, amountMinor: amountMinor.toString() },
      },
      async () => {
        const houseFloat = await this.ledger.systemAccountId('HOUSE_FLOAT');
        const posted = await this.prisma.client.$transaction(async (tx) => {
          const wallet = await this.ledger.lockWalletByUser(tx, userId);
          await this.risk.assertCanTopUp(tx, userId, amountMinor);
          return this.ledger.postEntry(tx, {
            kind: 'TOPUP',
            description: 'Demo credit top-up',
            referenceType: 'TOPUP',
            referenceId: idempotencyKey,
            idempotencyKey: `topup:${userId}:${idempotencyKey}`,
            createdById: actorId ?? userId,
            metadata: { source: 'demo-topup' },
            lines: [
              { accountId: houseFloat, direction: 'DEBIT', amountMinor },
              { accountId: wallet.accountId, direction: 'CREDIT', amountMinor },
            ],
          });
        });
        return this.responseFromPosting(userId, posted);
      },
    );
    if (!replayed) this.realtime.emitWalletUpdate(userId, result.wallet, 'topup');
    return { ...result, replayed };
  }

  /** Operator/admin balance correction posted against the ADJUSTMENTS account. */
  async adjust(params: {
    userId: string;
    direction: 'CREDIT' | 'DEBIT';
    amountMinor: string;
    reason: string;
    idempotencyKey: string;
    actorId: string;
  }): Promise<TopupResponse & { replayed: boolean }> {
    const amountMinor = toBigInt(params.amountMinor);
    const { result, replayed } = await this.idempotency.run(
      {
        scope: 'wallet.adjust',
        key: params.idempotencyKey,
        userId: params.userId,
        payload: { ...params, amountMinor: amountMinor.toString() },
      },
      async () => {
        const adjustments = await this.ledger.systemAccountId('ADJUSTMENTS');
        const posted = await this.prisma.client.$transaction(async (tx) => {
          const wallet = await this.ledger.lockWalletByUser(tx, params.userId);
          const walletDirection = params.direction;
          return this.ledger.postEntry(tx, {
            kind: params.direction === 'CREDIT' ? 'ADJUSTMENT_CREDIT' : 'ADJUSTMENT_DEBIT',
            description: `Manual adjustment: ${params.reason}`,
            referenceType: 'ADJUSTMENT',
            referenceId: params.idempotencyKey,
            idempotencyKey: `adjust:${params.idempotencyKey}`,
            createdById: params.actorId,
            metadata: { reason: params.reason },
            lines: [
              {
                accountId: adjustments,
                direction: walletDirection === 'CREDIT' ? 'DEBIT' : 'CREDIT',
                amountMinor,
              },
              { accountId: wallet.accountId, direction: walletDirection, amountMinor },
            ],
          });
        });
        return this.responseFromPosting(params.userId, posted);
      },
    );
    if (!replayed) this.realtime.emitWalletUpdate(params.userId, result.wallet, 'adjustment');
    return { ...result, replayed };
  }

  async reverseEntry(
    entryId: string,
    reason: string,
    actorId: string,
  ): Promise<{ entryId: string; affectedUserIds: string[] }> {
    const posted = await this.prisma.client.$transaction(async (tx) => {
      const original = await tx.journalEntry.findUnique({
        where: { id: entryId },
        include: { lines: { include: { account: { include: { wallet: true } } } } },
      });
      if (!original) throw new NotFoundError('Journal entry', entryId);
      const userIds = original.lines
        .map((l) => l.account.wallet?.userId)
        .filter((u): u is string => Boolean(u))
        .sort();
      for (const userId of userIds) await this.ledger.lockWalletByUser(tx, userId);
      return this.ledger.reverseEntry(tx, entryId, reason, actorId);
    });
    const affected: string[] = [];
    for (const balance of posted.walletBalances.values()) {
      affected.push(balance.userId);
      const wallet = await this.prisma.client.wallet.findUnique({
        where: { id: balance.walletId },
      });
      if (wallet) this.realtime.emitWalletUpdate(balance.userId, toWalletDto(wallet), 'reversal');
    }
    return { entryId: posted.entry.id, affectedUserIds: affected };
  }

  private async responseFromPosting(userId: string, posted: PostedEntry): Promise<TopupResponse> {
    const wallet = await this.prisma.client.wallet.findUniqueOrThrow({ where: { userId } });
    const balance = posted.walletBalances.get(wallet.id);
    const transaction = balance
      ? await this.prisma.client.walletTransaction.findUniqueOrThrow({
          where: { id: balance.transactionId },
        })
      : null;
    if (!transaction) throw new Error('posting did not touch the player wallet');
    return { wallet: toWalletDto(wallet), transaction: toTransactionDto(transaction) };
  }
}

export function toWalletDto(wallet: Wallet): WalletDto {
  return {
    id: wallet.id,
    currency: wallet.currency,
    balanceMinor: wallet.balanceMinor.toString(),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

export function toTransactionDto(tx: WalletTransaction): WalletTransactionDto {
  return {
    id: tx.id,
    kind: tx.kind,
    amountMinor: tx.amountMinor.toString(),
    balanceAfterMinor: tx.balanceAfterMinor.toString(),
    description: tx.description,
    referenceType: tx.referenceType,
    referenceId: tx.referenceId,
    entryId: tx.entryId,
    createdAt: tx.createdAt.toISOString(),
  };
}

export { Prisma };
