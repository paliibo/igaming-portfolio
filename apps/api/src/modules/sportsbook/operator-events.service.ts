import { Injectable } from '@nestjs/common';
import type {
  CreateEventInput,
  SettleEventInput,
  SportsEventDto,
  UpdateEventStateInput,
} from '@igaming/contracts';
import { PrismaService } from '../../common/prisma.service.js';
import { DomainError, NotFoundError } from '../../common/errors.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { SportsbookService, toMarketDto, toSelectionDto } from './sportsbook.service.js';
import { marketsFor } from './fixtures.js';

@Injectable()
export class OperatorEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sportsbook: SportsbookService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async createEvent(input: CreateEventInput): Promise<SportsEventDto> {
    const sport = await this.prisma.client.sport.findUnique({ where: { slug: input.sportSlug } });
    if (!sport) throw new NotFoundError('Sport', input.sportSlug);
    const event = await this.prisma.client.sportsEvent.create({
      data: {
        sportId: sport.id,
        competition: input.competition,
        homeTeam: input.homeTeam,
        awayTeam: input.awayTeam,
        startsAt: new Date(input.startsAt),
        featured: input.featured,
        markets: {
          create: marketsFor(sport.slug, input.homeTeam, input.awayTeam).map((m, idx) => ({
            type: m.type,
            name: m.name,
            line: m.line,
            sortOrder: idx,
            selections: { create: m.selections.map((s, sIdx) => ({ ...s, sortOrder: sIdx })) },
          })),
        },
      },
    });
    return this.sportsbook.getEvent(event.id);
  }

  async updateEventState(id: string, input: UpdateEventStateInput): Promise<SportsEventDto> {
    const event = await this.prisma.client.sportsEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundError('Event', id);
    if (event.status === 'SETTLED' || event.status === 'CANCELLED')
      throw new DomainError('EVENT_FINAL', 'Settled or cancelled events cannot be edited', 409);
    const updated = await this.prisma.client.sportsEvent.update({ where: { id }, data: input });
    if (input.status === 'FINISHED') {
      await this.prisma.client.bettingMarket.updateMany({
        where: { eventId: id, status: { in: ['OPEN', 'SUSPENDED'] } },
        data: { status: 'CLOSED' },
      });
    }
    this.realtime.emitEventUpdate({
      eventId: id,
      status: updated.status,
      homeScore: updated.homeScore,
      awayScore: updated.awayScore,
      clockMinute: updated.clockMinute,
      periodLabel: updated.periodLabel,
    });
    return this.sportsbook.getEvent(id);
  }

  async markFinished(id: string, score: SettleEventInput): Promise<void> {
    const event = await this.prisma.client.sportsEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundError('Event', id);
    if (event.status === 'SETTLED')
      throw new DomainError('EVENT_SETTLED', 'Event is already settled', 409);
    if (event.status === 'CANCELLED')
      throw new DomainError('EVENT_CANCELLED', 'Cancelled events cannot be settled', 409);
    await this.prisma.client.$transaction([
      this.prisma.client.sportsEvent.update({
        where: { id },
        data: {
          status: 'FINISHED',
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          periodLabel: 'FT',
        },
      }),
      this.prisma.client.bettingMarket.updateMany({
        where: { eventId: id, status: { in: ['OPEN', 'SUSPENDED'] } },
        data: { status: 'CLOSED' },
      }),
    ]);
    this.realtime.emitEventUpdate({
      eventId: id,
      status: 'FINISHED',
      homeScore: score.homeScore,
      awayScore: score.awayScore,
      clockMinute: event.clockMinute,
      periodLabel: 'FT',
    });
  }

  async updateMarketStatus(id: string, status: 'OPEN' | 'SUSPENDED' | 'CLOSED') {
    const market = await this.prisma.client.bettingMarket.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!market) throw new NotFoundError('Market', id);
    if (market.status === 'SETTLED')
      throw new DomainError('MARKET_SETTLED', 'Settled markets cannot change status', 409);
    const updated = await this.prisma.client.bettingMarket.update({
      where: { id },
      data: { status },
      include: { selections: { orderBy: { sortOrder: 'asc' } } },
    });
    this.realtime.emitMarketStatus({ eventId: market.eventId, marketId: id, status });
    return toMarketDto(updated);
  }

  async updateSelectionPrice(id: string, priceMilli: number) {
    const selection = await this.prisma.client.marketSelection.findUnique({
      where: { id },
      include: { market: true },
    });
    if (!selection) throw new NotFoundError('Selection', id);
    if (selection.market.status === 'SETTLED')
      throw new DomainError('MARKET_SETTLED', 'Settled markets cannot be repriced', 409);
    const updated = await this.prisma.client.marketSelection.update({
      where: { id },
      data: { priceMilli, priceUpdatedAt: new Date(), priceVersion: { increment: 1 } },
    });
    this.realtime.emitOddsUpdate({
      eventId: selection.market.eventId,
      marketId: selection.marketId,
      selectionId: id,
      previousPriceMilli: selection.priceMilli,
      priceMilli: updated.priceMilli,
      priceVersion: updated.priceVersion,
      updatedAt: updated.priceUpdatedAt.toISOString(),
    });
    return toSelectionDto(updated);
  }
}
