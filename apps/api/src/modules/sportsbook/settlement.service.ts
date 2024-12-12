import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma.service.js';
import { DomainError, NotFoundError } from '../../common/errors.js';
import { computePayoutMinor } from '../../common/money.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { toWalletDto } from '../wallet/wallet.service.js';
import { resolveBetStatus, resolveMarket } from './market-resolver.js';

export const SETTLEMENT_QUEUE = 'settlement';

export interface SettlementJob {
  eventId: string;
  homeScore: number;
  awayScore: number;
  requestedBy: string;
}

export interface SettlementSummary {
  eventId: string;
  betsSettled: number;
  betsWon: number;
  betsLost: number;
  betsVoid: number;
  paidOutMinor: string;
}

/**
 * Settles events and bets. Every step is idempotent: markets already SETTLED are skipped, and a bet
 * is paid only if a conditional update moves it from OPEN to a final status (exactly once).
 */
@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly realtime: RealtimeGateway,
    @InjectQueue(SETTLEMENT_QUEUE) private readonly queue: Queue<SettlementJob>,
  ) {}

  async enqueue(job: SettlementJob): Promise<string> {
    const queued = await this.queue.add('settle-event', job, {
      jobId: `settle-${job.eventId}-${job.homeScore}-${job.awayScore}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    });
    return queued.id ?? '';
  }

  async settleEvent(job: SettlementJob): Promise<SettlementSummary> {
    const event = await this.prisma.client.sportsEvent.findUnique({
      where: { id: job.eventId },
      include: { markets: { include: { selections: true } } },
    });
    if (!event) throw new NotFoundError('Event', job.eventId);
    if (event.status === 'CANCELLED')
      throw new DomainError('EVENT_CANCELLED', 'Cancelled events cannot be settled', 409);

    await this.prisma.client.$transaction(async (tx) => {
      for (const market of event.markets) {
        if (market.status === 'SETTLED') continue;
        const results = resolveMarket(
          {
            type: market.type,
            line: market.line === null ? null : Number(market.line),
            selections: market.selections,
          },
          job.homeScore,
          job.awayScore,
        );
        for (const [selectionId, result] of results) {
          await tx.marketSelection.update({ where: { id: selectionId }, data: { result } });
        }
        await tx.bettingMarket.update({ where: { id: market.id }, data: { status: 'SETTLED' } });
      }
      await tx.sportsEvent.update({
        where: { id: event.id },
        data: {
          status: 'SETTLED',
          homeScore: job.homeScore,
          awayScore: job.awayScore,
          settledAt: new Date(),
        },
      });
    });
    this.realtime.emitEventUpdate({
      eventId: event.id,
      status: 'SETTLED',
      homeScore: job.homeScore,
      awayScore: job.awayScore,
      clockMinute: event.clockMinute,
      periodLabel: 'FT',
    });
    for (const market of event.markets)
      this.realtime.emitMarketStatus({ eventId: event.id, marketId: market.id, status: 'SETTLED' });

    const summary = await this.settleOpenBetsForEvent(event.id, job.requestedBy);
    this.logger.log(
      `settled event ${event.id}: ${summary.betsSettled} bets, paid ${summary.paidOutMinor} minor`,
    );
    return summary;
  }

  /** Settles each OPEN bet touching the event whose selections are all resolved. */
  async settleOpenBetsForEvent(eventId: string, actorId: string): Promise<SettlementSummary> {
    const bets = await this.prisma.client.bet.findMany({
      where: { status: 'OPEN', selections: { some: { selection: { market: { eventId } } } } },
      include: { selections: { include: { selection: true } } },
    });
    const summary: SettlementSummary = {
      eventId,
      betsSettled: 0,
      betsWon: 0,
      betsLost: 0,
      betsVoid: 0,
      paidOutMinor: '0',
    };
    let paid = 0n;
    for (const bet of bets) {
      const results = bet.selections.map((bs) => bs.selection.result);
      const status = resolveBetStatus(results);
      if (!status) continue;
      const outcome = await this.settleBet(bet.id, status, actorId);
      if (!outcome) continue;
      summary.betsSettled += 1;
      if (status === 'WON') summary.betsWon += 1;
      if (status === 'LOST') summary.betsLost += 1;
      if (status === 'VOID') summary.betsVoid += 1;
      paid += outcome.payoutMinor;
    }
    summary.paidOutMinor = paid.toString();
    return summary;
  }

  /** Returns null when the bet was already settled by a concurrent or earlier run. */
  async settleBet(
    betId: string,
    status: 'WON' | 'LOST' | 'VOID',
    actorId: string,
  ): Promise<{ payoutMinor: bigint } | null> {
    const sportsbookRevenue = await this.ledger.systemAccountId('SPORTSBOOK_REVENUE');
    const result = await this.prisma.client.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({
        where: { id: betId },
        include: { selections: { include: { selection: true } } },
      });
      if (!bet || bet.status !== 'OPEN') return null;
      const wallet = await this.ledger.lockWalletByUser(tx, bet.userId);

      const claimed = await tx.bet.updateMany({
        where: { id: betId, status: 'OPEN' },
        data: { status },
      });
      if (claimed.count !== 1) return null;

      let payoutMinor = 0n;
      let entryId: string | null = null;
      if (status === 'WON') {
        const prices = bet.selections.map((bs) =>
          bs.selection.result === 'VOID' ? 1000 : bs.priceMilli,
        );
        payoutMinor = computePayoutMinor(bet.stakeMinor, prices);
      } else if (status === 'VOID') {
        payoutMinor = bet.stakeMinor;
      }
      if (payoutMinor > 0n) {
        const posted = await this.ledger.postEntry(tx, {
          kind: status === 'VOID' ? 'BET_REFUND' : 'BET_PAYOUT',
          description: status === 'VOID' ? 'Bet voided · stake refunded' : 'Winning bet payout',
          referenceType: 'BET',
          referenceId: bet.id,
          idempotencyKey: `bet-settle:${bet.id}`,
          createdById: actorUserId(actorId),
          metadata: { status, requestedBy: actorId },
          lines: [
            { accountId: sportsbookRevenue, direction: 'DEBIT', amountMinor: payoutMinor },
            { accountId: wallet.accountId, direction: 'CREDIT', amountMinor: payoutMinor },
          ],
        });
        entryId = posted.entry.id;
      }
      for (const bs of bet.selections) {
        await tx.betSelection.update({
          where: { id: bs.id },
          data: { result: bs.selection.result },
        });
      }
      await tx.bet.update({
        where: { id: betId },
        data: { payoutMinor, settledAt: new Date(), settlementEntryId: entryId },
      });
      return { userId: bet.userId, payoutMinor };
    });
    if (!result) return null;
    const wallet = await this.prisma.client.wallet.findUniqueOrThrow({
      where: { userId: result.userId },
    });
    this.realtime.emitWalletUpdate(result.userId, toWalletDto(wallet), 'bet-settled');
    this.realtime.emitBetSettled(result.userId, {
      betId,
      status,
      payoutMinor: result.payoutMinor.toString(),
    });
    return { payoutMinor: result.payoutMinor };
  }

  /** Cancels an event: voids every open bet (stake refund) and closes its markets. */
  async cancelEvent(eventId: string, actorId: string): Promise<SettlementSummary> {
    const event = await this.prisma.client.sportsEvent.findUnique({
      where: { id: eventId },
      include: { markets: true },
    });
    if (!event) throw new NotFoundError('Event', eventId);
    if (event.status === 'SETTLED')
      throw new DomainError('EVENT_SETTLED', 'Settled events cannot be cancelled', 409);
    await this.prisma.client.$transaction(async (tx) => {
      await tx.marketSelection.updateMany({
        where: { market: { eventId } },
        data: { result: 'VOID' },
      });
      await tx.bettingMarket.updateMany({ where: { eventId }, data: { status: 'SETTLED' } });
      await tx.sportsEvent.update({
        where: { id: eventId },
        data: { status: 'CANCELLED', settledAt: new Date() },
      });
    });
    this.realtime.emitEventUpdate({
      eventId,
      status: 'CANCELLED',
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      clockMinute: event.clockMinute,
      periodLabel: null,
    });
    return this.settleOpenBetsForEvent(eventId, actorId);
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** System actors ("simulator") are not users; only real user ids go into the createdBy foreign key. */
function actorUserId(actor: string): string | undefined {
  return UUID_PATTERN.test(actor) ? actor : undefined;
}
