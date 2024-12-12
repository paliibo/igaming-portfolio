import { Injectable } from '@nestjs/common';
import type {
  BetDto,
  Page,
  PlaceBetInput,
  PlaceBetResponse,
  PriceChange,
} from '@igaming/contracts';
import {
  type Bet,
  type BetSelection,
  type BettingMarket,
  type MarketSelection,
  Prisma,
  type SportsEvent,
  type User,
} from '@igaming/database';
import { PrismaService, type DbClient } from '../../common/prisma.service.js';
import { ConflictError, DomainError, LimitExceededError } from '../../common/errors.js';
import { combinedPriceMilli, computePayoutMinor, toBigInt } from '../../common/money.js';
import { cursorArgs, toPage } from '../../common/pagination.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { RiskService } from '../risk/risk.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { toWalletDto } from '../wallet/wallet.service.js';

export const MIN_STAKE_MINOR = 100n; // 1 credit
export const MAX_STAKE_MINOR = 500_000n; // 5,000 credits
export const MAX_PAYOUT_MINOR = 10_000_000n; // 100,000 credits

export type BetWithSelections = Bet & {
  selections: (BetSelection & {
    selection: MarketSelection & { market: BettingMarket & { event: SportsEvent } };
  })[];
  user?: Pick<User, 'id' | 'email' | 'displayName'>;
};

export const betInclude = {
  selections: { include: { selection: { include: { market: { include: { event: true } } } } } },
  user: { select: { id: true, email: true, displayName: true } },
} satisfies Prisma.BetInclude;

@Injectable()
export class BettingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly risk: RiskService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Places a single or accumulator bet atomically: validates markets, prices, stake, balance and
   * player limits inside one transaction that also debits the wallet. Replays by idempotency key.
   */
  async placeBet(
    userId: string,
    input: PlaceBetInput,
  ): Promise<PlaceBetResponse & { replayed: boolean }> {
    const existing = await this.prisma.client.bet.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
      include: betInclude,
    });
    if (existing)
      return { bet: toBetDto(existing), wallet: await this.walletDto(userId), replayed: true };

    const stakeMinor = toBigInt(input.stakeMinor);
    if (stakeMinor < MIN_STAKE_MINOR)
      throw new DomainError('STAKE_TOO_LOW', 'Minimum stake is 1.00 credit');
    if (stakeMinor > MAX_STAKE_MINOR)
      throw new DomainError('STAKE_TOO_HIGH', 'Maximum stake is 5,000.00 credits');
    const selectionIds = input.selections.map((s) => s.selectionId);
    if (new Set(selectionIds).size !== selectionIds.length)
      throw new DomainError('DUPLICATE_SELECTION', 'Each selection may appear only once in a bet');

    const sportsbookRevenue = await this.ledger.systemAccountId('SPORTSBOOK_REVENUE');

    try {
      const bet = await this.prisma.client.$transaction(async (tx) => {
        const wallet = await this.ledger.lockWalletByUser(tx, userId);
        await this.risk.assertCanWager(tx, userId, stakeMinor);

        const selections = await tx.marketSelection.findMany({
          where: { id: { in: selectionIds } },
          include: { market: { include: { event: true } } },
        });
        if (selections.length !== selectionIds.length)
          throw new DomainError(
            'SELECTION_NOT_FOUND',
            'One or more selections no longer exist',
            404,
          );

        const eventIds = new Set(selections.map((s) => s.market.eventId));
        if (eventIds.size !== selections.length)
          throw new DomainError(
            'SAME_EVENT_ACCUMULATOR',
            'Selections in one bet must come from different events',
          );

        const priceChanges: PriceChange[] = [];
        for (const selection of selections) {
          const { market } = selection;
          if (market.status !== 'OPEN')
            throw new DomainError(
              'MARKET_NOT_OPEN',
              `${market.name} is ${market.status.toLowerCase()}`,
              409,
              { marketId: market.id, status: market.status },
            );
          if (market.event.status !== 'SCHEDULED' && market.event.status !== 'LIVE') {
            throw new DomainError('EVENT_NOT_BETTABLE', 'This event no longer accepts bets', 409, {
              eventId: market.eventId,
              status: market.event.status,
            });
          }
          const submitted = input.selections.find((s) => s.selectionId === selection.id)!;
          if (submitted.priceMilli !== selection.priceMilli) {
            priceChanges.push({
              selectionId: selection.id,
              selectionName: selection.name,
              submittedPriceMilli: submitted.priceMilli,
              currentPriceMilli: selection.priceMilli,
            });
          }
        }
        if (priceChanges.length > 0 && !input.acceptPriceChanges) {
          throw new ConflictError(
            'PRICE_CHANGED',
            'Odds have changed since you added these selections',
            { changes: priceChanges },
          );
        }

        const prices = selections.map((s) => s.priceMilli);
        const totalPriceMilli = combinedPriceMilli(prices);
        const potentialPayoutMinor = computePayoutMinor(stakeMinor, prices);
        if (potentialPayoutMinor > MAX_PAYOUT_MINOR)
          throw new DomainError(
            'PAYOUT_TOO_HIGH',
            'Potential payout exceeds the 100,000 credit limit',
          );

        const created = await tx.bet.create({
          data: {
            userId,
            idempotencyKey: input.idempotencyKey,
            stakeMinor,
            totalPriceMilli,
            potentialPayoutMinor,
            selections: {
              create: selections.map((s) => ({ selectionId: s.id, priceMilli: s.priceMilli })),
            },
          },
        });

        const posted = await this.ledger.postEntry(tx, {
          kind: 'BET_STAKE',
          description: `Bet stake · ${selections.map((s) => s.name).join(' / ')}`,
          referenceType: 'BET',
          referenceId: created.id,
          idempotencyKey: `bet-stake:${created.id}`,
          createdById: userId,
          metadata: {
            selectionCount: selections.length,
            totalPriceMilli: totalPriceMilli.toString(),
          },
          lines: [
            { accountId: wallet.accountId, direction: 'DEBIT', amountMinor: stakeMinor },
            { accountId: sportsbookRevenue, direction: 'CREDIT', amountMinor: stakeMinor },
          ],
        });
        return tx.bet.update({
          where: { id: created.id },
          data: { stakeEntryId: posted.entry.id },
          include: betInclude,
        });
      });

      const wallet = await this.walletDto(userId);
      this.realtime.emitWalletUpdate(userId, wallet, 'bet-placed');
      void this.risk.evaluateAfterWager(userId, stakeMinor, 'sportsbook');
      return { bet: toBetDto(bet), wallet, replayed: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await this.prisma.client.bet.findUnique({
          where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
          include: betInclude,
        });
        if (replay)
          return { bet: toBetDto(replay), wallet: await this.walletDto(userId), replayed: true };
      }
      if (error instanceof LimitExceededError)
        void this.risk.recordLimitBreachAttempt(
          userId,
          String(
            (error.details as { limitMinor?: string } | undefined) ? 'DAILY_WAGER' : 'DAILY_WAGER',
          ),
          stakeMinor,
        );
      throw error;
    }
  }

  async listBets(
    userId: string,
    query: { status: 'open' | 'settled' | 'all'; cursor?: string; limit: number },
  ): Promise<Page<BetDto>> {
    const rows = await this.prisma.client.bet.findMany({
      where: {
        userId,
        ...(query.status === 'open'
          ? { status: 'OPEN' }
          : query.status === 'settled'
            ? { status: { not: 'OPEN' } }
            : {}),
      },
      include: betInclude,
      orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(query.cursor, query.limit),
    });
    const page = toPage(rows, query.limit);
    return { items: page.items.map(toBetDto), nextCursor: page.nextCursor };
  }

  async getBet(userId: string, betId: string): Promise<BetDto> {
    const bet = await this.prisma.client.bet.findFirst({
      where: { id: betId, userId },
      include: betInclude,
    });
    if (!bet) throw new DomainError('NOT_FOUND', 'Bet not found', 404);
    return toBetDto(bet);
  }

  private async walletDto(userId: string, db: DbClient = this.prisma.client) {
    const wallet = await db.wallet.findUniqueOrThrow({ where: { userId } });
    return toWalletDto(wallet);
  }
}

export function toBetDto(bet: BetWithSelections): BetDto {
  return {
    id: bet.id,
    userId: bet.userId,
    stakeMinor: bet.stakeMinor.toString(),
    totalPriceMilli: bet.totalPriceMilli.toString(),
    potentialPayoutMinor: bet.potentialPayoutMinor.toString(),
    payoutMinor: bet.payoutMinor?.toString() ?? null,
    status: bet.status,
    placedAt: bet.placedAt.toISOString(),
    settledAt: bet.settledAt?.toISOString() ?? null,
    stakeEntryId: bet.stakeEntryId,
    settlementEntryId: bet.settlementEntryId,
    selections: bet.selections.map((bs) => ({
      id: bs.id,
      selectionId: bs.selectionId,
      priceMilli: bs.priceMilli,
      result: bs.result,
      selectionName: bs.selection.name,
      marketName: bs.selection.market.name,
      marketType: bs.selection.market.type,
      eventId: bs.selection.market.eventId,
      eventName: `${bs.selection.market.event.homeTeam} vs ${bs.selection.market.event.awayTeam}`,
      eventStatus: bs.selection.market.event.status,
      homeScore: bs.selection.market.event.homeScore,
      awayScore: bs.selection.market.event.awayScore,
    })),
    ...(bet.user ? { player: bet.user } : {}),
  };
}
