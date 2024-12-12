import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { ENV, type Env } from '../../config/env.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { SettlementService } from './settlement.service.js';
import {
  BASKETBALL_COMPETITIONS,
  BASKETBALL_TEAMS,
  FOOTBALL_COMPETITIONS,
  FOOTBALL_TEAMS,
  FULL_TIME_MINUTE,
  marketsFor,
} from './fixtures.js';

const ODDS_TICK_MS = 4000;
const CLOCK_TICK_MS = 10_000;
const MIN_UPCOMING_EVENTS = 5;
const SIMULATED_MINUTES_PER_TICK = 3;

/**
 * Local stand-in for a commercial odds feed. It drifts prices on open selections, advances the
 * match clock of live events, suspends markets briefly when a goal lands, and hands finished
 * events to the settlement queue. Nothing here touches wallets directly.
 */
@Injectable()
export class OddsSimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OddsSimulatorService.name);
  private oddsTimer?: NodeJS.Timeout;
  private clockTimer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly settlement: SettlementService,
  ) {}

  onModuleInit() {
    if (!this.env.SIMULATOR_ENABLED || this.env.isTest) return;
    this.oddsTimer = setInterval(() => void this.guard(() => this.driftOdds()), ODDS_TICK_MS);
    this.clockTimer = setInterval(
      () => void this.guard(() => this.advanceMatches()),
      CLOCK_TICK_MS,
    );
    this.logger.log('odds simulator started');
  }

  onModuleDestroy() {
    if (this.oddsTimer) clearInterval(this.oddsTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  private async guard(fn: () => Promise<void>) {
    if (this.running) return;
    this.running = true;
    try {
      await fn();
    } catch (error) {
      this.logger.error(
        'simulator tick failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }

  /** Nudges 1–3 random open selections by 2–8 % and broadcasts the new prices. */
  async driftOdds(): Promise<void> {
    const candidates = await this.prisma.client.marketSelection.findMany({
      where: { market: { status: 'OPEN', event: { status: { in: ['SCHEDULED', 'LIVE'] } } } },
      select: { id: true, priceMilli: true, marketId: true, market: { select: { eventId: true } } },
    });
    if (candidates.length === 0) return;
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i += 1) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)]!;
      await this.movePrice(pick.id, pick.priceMilli, pick.marketId, pick.market.eventId);
    }
  }

  async movePrice(
    selectionId: string,
    current: number,
    marketId: string,
    eventId: string,
    forcedFactor?: number,
  ): Promise<void> {
    const factor =
      forcedFactor ?? 1 + (Math.random() < 0.5 ? -1 : 1) * (0.02 + Math.random() * 0.06);
    const next = Math.max(1050, Math.min(50_000, Math.round((current * factor) / 10) * 10));
    if (next === current) return;
    const updated = await this.prisma.client.marketSelection.update({
      where: { id: selectionId },
      data: { priceMilli: next, priceUpdatedAt: new Date(), priceVersion: { increment: 1 } },
    });
    this.realtime.emitOddsUpdate({
      eventId,
      marketId,
      selectionId,
      previousPriceMilli: current,
      priceMilli: updated.priceMilli,
      priceVersion: updated.priceVersion,
      updatedAt: updated.priceUpdatedAt.toISOString(),
    });
  }

  /** Kicks off scheduled events, advances live clocks, scores, suspends/reopens markets, finishes matches. */
  async advanceMatches(): Promise<void> {
    const now = new Date();
    const toStart = await this.prisma.client.sportsEvent.findMany({
      where: { status: 'SCHEDULED', startsAt: { lte: now } },
      include: { sport: true },
    });
    for (const event of toStart) {
      const updated = await this.prisma.client.sportsEvent.update({
        where: { id: event.id },
        data: {
          status: 'LIVE',
          clockMinute: 1,
          periodLabel: event.sport.slug === 'basketball' ? 'Q1' : '1H',
        },
      });
      this.emitEvent(updated);
    }

    const live = await this.prisma.client.sportsEvent.findMany({
      where: { status: 'LIVE' },
      include: { sport: true, markets: { include: { selections: true } } },
    });
    for (const event of live) {
      const fullTime = FULL_TIME_MINUTE[event.sport.slug] ?? 90;
      const minute = Math.min(fullTime, event.clockMinute + SIMULATED_MINUTES_PER_TICK);
      let { homeScore, awayScore } = event;
      let scored = false;
      if (event.sport.slug === 'basketball') {
        homeScore += Math.floor(Math.random() * 8);
        awayScore += Math.floor(Math.random() * 8);
        scored = true;
      } else if (Math.random() < 0.12) {
        if (Math.random() < 0.5) homeScore += 1;
        else awayScore += 1;
        scored = true;
      }
      const periodLabel =
        event.sport.slug === 'basketball'
          ? `Q${Math.min(4, 1 + Math.floor((minute - 1) / 12))}`
          : minute > 45
            ? '2H'
            : '1H';
      const updated = await this.prisma.client.sportsEvent.update({
        where: { id: event.id },
        data: { clockMinute: minute, homeScore, awayScore, periodLabel },
      });
      this.emitEvent(updated);

      if (minute >= fullTime) {
        await this.prisma.client.sportsEvent.update({
          where: { id: event.id },
          data: { status: 'FINISHED', periodLabel: 'FT' },
        });
        await this.prisma.client.bettingMarket.updateMany({
          where: { eventId: event.id, status: { in: ['OPEN', 'SUSPENDED'] } },
          data: { status: 'CLOSED' },
        });
        for (const m of event.markets)
          this.realtime.emitMarketStatus({ eventId: event.id, marketId: m.id, status: 'CLOSED' });
        this.emitEvent({ ...updated, status: 'FINISHED', periodLabel: 'FT' });
        await this.settlement.enqueue({
          eventId: event.id,
          homeScore,
          awayScore,
          requestedBy: 'simulator',
        });
        continue;
      }

      if (scored && event.sport.slug === 'football') {
        await this.suspendBriefly(
          event.id,
          event.markets.filter((m) => m.status === 'OPEN').map((m) => m.id),
        );
        const winner = event.markets.find((m) => m.type === 'MATCH_WINNER');
        if (winner) {
          const leader = homeScore > awayScore ? 'HOME' : homeScore < awayScore ? 'AWAY' : 'DRAW';
          for (const s of winner.selections) {
            await this.movePrice(
              s.id,
              s.priceMilli,
              winner.id,
              event.id,
              s.outcomeKey === leader ? 0.8 : 1.25,
            );
          }
        }
      }
    }

    await this.topUpFixtures();
  }

  private async suspendBriefly(eventId: string, marketIds: string[]) {
    if (marketIds.length === 0) return;
    await this.prisma.client.bettingMarket.updateMany({
      where: { id: { in: marketIds } },
      data: { status: 'SUSPENDED' },
    });
    for (const id of marketIds)
      this.realtime.emitMarketStatus({ eventId, marketId: id, status: 'SUSPENDED' });
    setTimeout(() => {
      void this.prisma.client.bettingMarket
        .updateMany({
          where: { id: { in: marketIds }, status: 'SUSPENDED' },
          data: { status: 'OPEN' },
        })
        .then(() => {
          for (const id of marketIds)
            this.realtime.emitMarketStatus({ eventId, marketId: id, status: 'OPEN' });
        })
        .catch((error: unknown) =>
          this.logger.error(
            'failed to reopen markets',
            error instanceof Error ? error.stack : String(error),
          ),
        );
    }, 6000);
  }

  /** Keeps the lobby populated: when few events remain, schedules fresh demo fixtures. */
  async topUpFixtures(): Promise<void> {
    const upcoming = await this.prisma.client.sportsEvent.count({
      where: { status: { in: ['SCHEDULED', 'LIVE'] } },
    });
    if (upcoming >= MIN_UPCOMING_EVENTS) return;
    const sports = await this.prisma.client.sport.findMany();
    for (let i = upcoming; i < MIN_UPCOMING_EVENTS; i += 1) {
      const sport = sports[i % sports.length]!;
      const teams = sport.slug === 'basketball' ? BASKETBALL_TEAMS : FOOTBALL_TEAMS;
      const competitions =
        sport.slug === 'basketball' ? BASKETBALL_COMPETITIONS : FOOTBALL_COMPETITIONS;
      const [home, away] = pickTwo(teams);
      const startsAt = new Date(Date.now() + (2 + i * 4) * 60_000);
      const favourite = (['home', 'away', 'even'] as const)[Math.floor(Math.random() * 3)]!;
      await this.prisma.client.sportsEvent.create({
        data: {
          sportId: sport.id,
          competition: competitions[Math.floor(Math.random() * competitions.length)]!,
          homeTeam: home,
          awayTeam: away,
          startsAt,
          markets: {
            create: marketsFor(sport.slug, home, away, favourite).map((m, idx) => ({
              type: m.type,
              name: m.name,
              line: m.line,
              sortOrder: idx,
              selections: { create: m.selections.map((s, sIdx) => ({ ...s, sortOrder: sIdx })) },
            })),
          },
        },
      });
    }
    this.logger.log('scheduled additional demo fixtures');
  }

  private emitEvent(event: {
    id: string;
    status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'SETTLED' | 'CANCELLED';
    homeScore: number;
    awayScore: number;
    clockMinute: number;
    periodLabel: string | null;
  }) {
    this.realtime.emitEventUpdate({
      eventId: event.id,
      status: event.status,
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      clockMinute: event.clockMinute,
      periodLabel: event.periodLabel,
    });
  }
}

function pickTwo<T>(items: readonly T[]): [T, T] {
  const a = Math.floor(Math.random() * items.length);
  let b = Math.floor(Math.random() * (items.length - 1));
  if (b >= a) b += 1;
  return [items[a]!, items[b]!];
}
