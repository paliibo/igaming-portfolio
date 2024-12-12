import { Injectable } from '@nestjs/common';
import type { MarketDto, SelectionDto, SportDto, SportsEventDto } from '@igaming/contracts';
import type {
  BettingMarket,
  MarketSelection,
  Sport,
  SportsEvent,
  SportsEventStatus,
} from '@igaming/database';
import { PrismaService, type DbClient } from '../../common/prisma.service.js';
import { NotFoundError } from '../../common/errors.js';

export type EventWithMarkets = SportsEvent & {
  sport: Sport;
  markets: (BettingMarket & { selections: MarketSelection[] })[];
};

const eventInclude = {
  sport: true,
  markets: {
    orderBy: { sortOrder: 'asc' as const },
    include: { selections: { orderBy: { sortOrder: 'asc' as const } } },
  },
};

@Injectable()
export class SportsbookService {
  constructor(private readonly prisma: PrismaService) {}

  async listSports(): Promise<SportDto[]> {
    const sports = await this.prisma.client.sport.findMany({
      include: {
        _count: { select: { events: { where: { status: { in: ['SCHEDULED', 'LIVE'] } } } } },
      },
      orderBy: { name: 'asc' },
    });
    return sports.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      eventCount: s._count.events,
    }));
  }

  async listEvents(
    query: { sport?: string; status: 'upcoming' | 'live' | 'finished' | 'all'; featured?: boolean },
    includeBetCount = false,
  ): Promise<SportsEventDto[]> {
    const statusFilter: SportsEventStatus[] | undefined =
      query.status === 'upcoming'
        ? ['SCHEDULED', 'LIVE']
        : query.status === 'live'
          ? ['LIVE']
          : query.status === 'finished'
            ? ['FINISHED', 'SETTLED', 'CANCELLED']
            : undefined;
    const events = await this.prisma.client.sportsEvent.findMany({
      where: {
        ...(query.sport ? { sport: { slug: query.sport } } : {}),
        ...(statusFilter ? { status: { in: statusFilter } } : {}),
        ...(query.featured ? { featured: true } : {}),
      },
      include: eventInclude,
      orderBy:
        query.status === 'finished'
          ? [{ startsAt: 'desc' }]
          : [{ status: 'desc' }, { startsAt: 'asc' }],
      take: 100,
    });
    const betCounts = includeBetCount
      ? await this.betCountsByEvent(events.map((e) => e.id))
      : new Map<string, number>();
    return events.map((e) =>
      toEventDto(e, includeBetCount ? (betCounts.get(e.id) ?? 0) : undefined),
    );
  }

  async getEvent(id: string, db: DbClient = this.prisma.client): Promise<SportsEventDto> {
    const event = await db.sportsEvent.findUnique({ where: { id }, include: eventInclude });
    if (!event) throw new NotFoundError('Event', id);
    return toEventDto(event);
  }

  private async betCountsByEvent(eventIds: string[]): Promise<Map<string, number>> {
    if (eventIds.length === 0) return new Map();
    const rows = await this.prisma.client.$queryRaw<{ eventId: string; count: bigint }[]>`
      SELECT m."eventId", COUNT(DISTINCT bs."betId")::bigint AS count
      FROM "BetSelection" bs
      JOIN "MarketSelection" s ON s.id = bs."selectionId"
      JOIN "BettingMarket" m ON m.id = s."marketId"
      WHERE m."eventId" = ANY(${eventIds}::text[])
      GROUP BY m."eventId"`;
    return new Map(rows.map((r) => [r.eventId, Number(r.count)]));
  }
}

export function toSelectionDto(s: MarketSelection): SelectionDto {
  return {
    id: s.id,
    marketId: s.marketId,
    name: s.name,
    outcomeKey: s.outcomeKey,
    priceMilli: s.priceMilli,
    priceVersion: s.priceVersion,
    priceUpdatedAt: s.priceUpdatedAt.toISOString(),
    result: s.result,
  };
}

export function toMarketDto(m: BettingMarket & { selections: MarketSelection[] }): MarketDto {
  return {
    id: m.id,
    eventId: m.eventId,
    type: m.type,
    name: m.name,
    line: m.line === null ? null : m.line.toString(),
    status: m.status,
    selections: m.selections.map(toSelectionDto),
  };
}

export function toEventDto(e: EventWithMarkets, betCount?: number): SportsEventDto {
  return {
    id: e.id,
    sport: { id: e.sport.id, slug: e.sport.slug, name: e.sport.name },
    competition: e.competition,
    homeTeam: e.homeTeam,
    awayTeam: e.awayTeam,
    startsAt: e.startsAt.toISOString(),
    status: e.status,
    homeScore: e.homeScore,
    awayScore: e.awayScore,
    clockMinute: e.clockMinute,
    periodLabel: e.periodLabel,
    featured: e.featured,
    settledAt: e.settledAt?.toISOString() ?? null,
    markets: e.markets.map(toMarketDto),
    ...(betCount !== undefined ? { betCount } : {}),
  };
}
