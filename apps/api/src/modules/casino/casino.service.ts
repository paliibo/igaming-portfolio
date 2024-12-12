import { Inject, Injectable } from '@nestjs/common';
import type {
  CasinoGameDto,
  GameDetailDto,
  GameRoundDto,
  GameSessionDto,
  Page,
  PlayRoundInput,
  PlayRoundResponse,
} from '@igaming/contracts';
import {
  type CasinoGame,
  type GameRound,
  type GameSession,
  Prisma,
  type User,
} from '@igaming/database';
import { PrismaService } from '../../common/prisma.service.js';
import { DomainError, LimitExceededError, NotFoundError } from '../../common/errors.js';
import { toBigInt } from '../../common/money.js';
import { cursorArgs, toPage } from '../../common/pagination.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { RiskService } from '../risk/risk.service.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { toWalletDto } from '../wallet/wallet.service.js';
import { GAME_PROVIDERS, type GameProviderAdapter } from './providers/provider.interface.js';
import { RANDOM_SOURCE, type RandomSource } from './providers/random-source.js';

export type RoundWithGame = GameRound & {
  game: Pick<CasinoGame, 'slug' | 'name'>;
  user?: Pick<User, 'id' | 'email' | 'displayName'>;
};
export const roundInclude = {
  game: { select: { slug: true, name: true } },
  user: { select: { id: true, email: true, displayName: true } },
} satisfies Prisma.GameRoundInclude;

@Injectable()
export class CasinoService {
  private readonly providers: Map<string, GameProviderAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly risk: RiskService,
    private readonly realtime: RealtimeGateway,
    @Inject(GAME_PROVIDERS) providers: GameProviderAdapter[],
    @Inject(RANDOM_SOURCE) private readonly random: RandomSource,
  ) {
    this.providers = new Map(providers.map((p) => [p.key, p]));
  }

  provider(key: string): GameProviderAdapter {
    const provider = this.providers.get(key);
    if (!provider)
      throw new DomainError('PROVIDER_UNAVAILABLE', `Game provider ${key} is not configured`, 503);
    return provider;
  }

  async listGames(
    query: { category?: string; search?: string; featured?: boolean },
    userId?: string,
    includeInactive = false,
  ): Promise<CasinoGameDto[]> {
    const games = await this.prisma.client.casinoGame.findMany({
      where: {
        ...(includeInactive ? {} : { status: { in: ['ACTIVE', 'MAINTENANCE'] } }),
        ...(query.category ? { category: query.category as CasinoGame['category'] } : {}),
        ...(query.featured ? { featured: true } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { tags: { has: query.search.toLowerCase() } },
              ],
            }
          : {}),
      },
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
      include: { _count: { select: { rounds: true } } },
    });
    const favorites = userId
      ? new Set(
          (
            await this.prisma.client.favoriteGame.findMany({
              where: { userId },
              select: { gameId: true },
            })
          ).map((f) => f.gameId),
        )
      : new Set<string>();
    return games.map((g) => ({
      ...toGameDto(g),
      isFavorite: favorites.has(g.id),
      roundCount: g._count.rounds,
    }));
  }

  async getGame(slug: string, userId?: string): Promise<GameDetailDto> {
    const game = await this.prisma.client.casinoGame.findUnique({
      where: { slug },
      include: { _count: { select: { rounds: true } } },
    });
    if (!game || game.status === 'DISABLED') throw new NotFoundError('Game', slug);
    const definition = this.provider(game.providerKey).getGame(game.providerGameId);
    const rules = definition?.rules ?? {
      slug,
      summary:
        'Showcase catalogue entry. This title is listed to demonstrate catalogue management and is not playable in the demo.',
    };
    const [favorite, recentRounds] = await Promise.all([
      userId
        ? this.prisma.client.favoriteGame.findUnique({
            where: { userId_gameId: { userId, gameId: game.id } },
          })
        : null,
      userId
        ? this.prisma.client.gameRound.findMany({
            where: { userId, gameId: game.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: roundInclude,
          })
        : [],
    ]);
    return {
      ...toGameDto(game),
      isFavorite: Boolean(favorite),
      roundCount: game._count.rounds,
      rules: { ...rules, slug },
      recentRounds: recentRounds.map(toRoundDto),
    };
  }

  async listFavorites(userId: string): Promise<CasinoGameDto[]> {
    const rows = await this.prisma.client.favoriteGame.findMany({
      where: { userId },
      include: { game: { include: { _count: { select: { rounds: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows
      .filter((r) => r.game.status !== 'DISABLED')
      .map((r) => ({ ...toGameDto(r.game), isFavorite: true, roundCount: r.game._count.rounds }));
  }

  async setFavorite(
    userId: string,
    gameId: string,
    favorite: boolean,
  ): Promise<{ isFavorite: boolean }> {
    const game = await this.prisma.client.casinoGame.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundError('Game', gameId);
    if (favorite) {
      await this.prisma.client.favoriteGame.upsert({
        where: { userId_gameId: { userId, gameId } },
        update: {},
        create: { userId, gameId },
      });
    } else {
      await this.prisma.client.favoriteGame.deleteMany({ where: { userId, gameId } });
    }
    return { isFavorite: favorite };
  }

  async createSession(userId: string, gameSlug: string): Promise<GameSessionDto> {
    const game = await this.prisma.client.casinoGame.findUnique({ where: { slug: gameSlug } });
    if (!game || game.status === 'DISABLED') throw new NotFoundError('Game', gameSlug);
    if (game.status === 'MAINTENANCE')
      throw new DomainError('GAME_IN_MAINTENANCE', `${game.name} is temporarily unavailable`, 409);
    if (!game.playable)
      throw new DomainError(
        'GAME_NOT_PLAYABLE',
        'This catalogue entry is a showcase listing without a playable engine',
        409,
      );
    const provider = this.provider(game.providerKey);
    if (!provider.isAvailable(game.providerGameId))
      throw new DomainError('GAME_UNAVAILABLE', 'Provider reports this game as unavailable', 409);
    await this.risk.getProfile(this.prisma.client, userId);

    await this.prisma.client.gameSession.updateMany({
      where: { userId, gameId: game.id, status: 'ACTIVE' },
      data: { status: 'CLOSED', endedAt: new Date() },
    });
    const { providerSessionRef } = await provider.createSession({
      userId,
      gameSlug: game.slug,
      providerGameId: game.providerGameId,
    });
    const session = await this.prisma.client.gameSession.create({
      data: { userId, gameId: game.id, providerKey: game.providerKey, providerSessionRef },
      include: { game: true },
    });
    return toSessionDto(session);
  }

  async closeSession(userId: string, sessionId: string): Promise<GameSessionDto> {
    const session = await this.prisma.client.gameSession.findFirst({
      where: { id: sessionId, userId },
      include: { game: true },
    });
    if (!session) throw new NotFoundError('Session', sessionId);
    if (session.status !== 'ACTIVE') return toSessionDto(session);
    await this.provider(session.providerKey).closeSession(session.providerSessionRef);
    const closed = await this.prisma.client.gameSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED', endedAt: new Date() },
      include: { game: true },
    });
    return toSessionDto(closed);
  }

  /**
   * Plays one round: stake debit, outcome, payout credit and round record all commit in a single
   * transaction. The (userId, clientRoundKey) unique constraint makes retries return the same round.
   */
  async playRound(userId: string, input: PlayRoundInput): Promise<PlayRoundResponse> {
    const existing = await this.prisma.client.gameRound.findUnique({
      where: { userId_clientRoundKey: { userId, clientRoundKey: input.clientRoundKey } },
      include: roundInclude,
    });
    if (existing)
      return { round: toRoundDto(existing), wallet: await this.walletDto(userId), replayed: true };

    const stakeMinor = toBigInt(input.stakeMinor);
    const session = await this.prisma.client.gameSession.findFirst({
      where: { id: input.sessionId, userId },
      include: { game: true },
    });
    if (!session) throw new NotFoundError('Session', input.sessionId);
    if (session.status !== 'ACTIVE')
      throw new DomainError('SESSION_CLOSED', 'This game session is closed; start a new one', 409);
    const { game } = session;
    if (game.status !== 'ACTIVE')
      throw new DomainError('GAME_UNAVAILABLE', `${game.name} is not available right now`, 409);
    if (stakeMinor < game.minStakeMinor || stakeMinor > game.maxStakeMinor) {
      throw new DomainError(
        'STAKE_OUT_OF_RANGE',
        `Stake must be between ${game.minStakeMinor} and ${game.maxStakeMinor} minor units`,
        422,
        {
          minStakeMinor: game.minStakeMinor.toString(),
          maxStakeMinor: game.maxStakeMinor.toString(),
        },
      );
    }
    const provider = this.provider(game.providerKey);
    const casinoRevenue = await this.ledger.systemAccountId('CASINO_REVENUE');

    try {
      const round = await this.prisma.client.$transaction(async (tx) => {
        const wallet = await this.ledger.lockWalletByUser(tx, userId);
        await this.risk.assertCanWager(tx, userId, stakeMinor);

        const result = await provider.playRound({
          providerSessionRef: session.providerSessionRef,
          providerGameId: game.providerGameId,
          roundKey: input.clientRoundKey,
          stakeMinor,
          input: input.input,
          random: this.random,
        });
        if (result.payoutMinor > stakeMinor * BigInt(game.maxWinMultiplier)) {
          throw new DomainError(
            'PAYOUT_EXCEEDS_CAP',
            'Provider payout exceeds the configured maximum win',
            500,
          );
        }

        const created = await tx.gameRound.create({
          data: {
            clientRoundKey: input.clientRoundKey,
            sessionId: session.id,
            gameId: game.id,
            userId,
            providerRoundRef: result.providerRoundRef,
            stakeMinor,
            payoutMinor: result.payoutMinor,
            status: 'COMPLETED',
            input: input.input,
            outcome: result.outcome as unknown as Prisma.InputJsonValue,
          },
        });
        const stake = await this.ledger.postEntry(tx, {
          kind: 'CASINO_STAKE',
          description: `${game.name} · round stake`,
          referenceType: 'GAME_ROUND',
          referenceId: created.id,
          idempotencyKey: `round-stake:${created.id}`,
          createdById: userId,
          metadata: { gameSlug: game.slug, providerRoundRef: result.providerRoundRef },
          lines: [
            { accountId: wallet.accountId, direction: 'DEBIT', amountMinor: stakeMinor },
            { accountId: casinoRevenue, direction: 'CREDIT', amountMinor: stakeMinor },
          ],
        });
        let payoutEntryId: string | null = null;
        if (result.payoutMinor > 0n) {
          const payout = await this.ledger.postEntry(tx, {
            kind: 'CASINO_PAYOUT',
            description: `${game.name} · round win`,
            referenceType: 'GAME_ROUND',
            referenceId: created.id,
            idempotencyKey: `round-payout:${created.id}`,
            createdById: userId,
            metadata: { gameSlug: game.slug, providerRoundRef: result.providerRoundRef },
            lines: [
              { accountId: casinoRevenue, direction: 'DEBIT', amountMinor: result.payoutMinor },
              { accountId: wallet.accountId, direction: 'CREDIT', amountMinor: result.payoutMinor },
            ],
          });
          payoutEntryId = payout.entry.id;
        }
        await tx.gameSession.update({
          where: { id: session.id },
          data: { lastActivityAt: new Date() },
        });
        return tx.gameRound.update({
          where: { id: created.id },
          data: { stakeEntryId: stake.entry.id, payoutEntryId, completedAt: new Date() },
          include: roundInclude,
        });
      });

      const wallet = await this.walletDto(userId);
      this.realtime.emitWalletUpdate(userId, wallet, 'casino-round');
      void this.risk.evaluateAfterWager(userId, stakeMinor, 'casino');
      return { round: toRoundDto(round), wallet, replayed: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await this.prisma.client.gameRound.findUnique({
          where: { userId_clientRoundKey: { userId, clientRoundKey: input.clientRoundKey } },
          include: roundInclude,
        });
        if (replay)
          return {
            round: toRoundDto(replay),
            wallet: await this.walletDto(userId),
            replayed: true,
          };
      }
      if (error instanceof LimitExceededError)
        void this.risk.recordLimitBreachAttempt(userId, 'DAILY_WAGER', stakeMinor);
      throw error;
    }
  }

  async listRounds(
    userId: string,
    query: { gameSlug?: string; cursor?: string; limit: number },
  ): Promise<Page<GameRoundDto>> {
    const rows = await this.prisma.client.gameRound.findMany({
      where: { userId, ...(query.gameSlug ? { game: { slug: query.gameSlug } } : {}) },
      include: roundInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(query.cursor, query.limit),
    });
    const page = toPage(rows, query.limit);
    return { items: page.items.map(toRoundDto), nextCursor: page.nextCursor };
  }

  async getRound(userId: string, id: string): Promise<GameRoundDto> {
    const round = await this.prisma.client.gameRound.findFirst({
      where: { id, userId },
      include: roundInclude,
    });
    if (!round) throw new NotFoundError('Round', id);
    return toRoundDto(round);
  }

  async updateGame(
    id: string,
    patch: {
      status?: CasinoGame['status'];
      featured?: boolean;
      minStakeMinor?: string;
      maxStakeMinor?: string;
    },
  ): Promise<CasinoGameDto> {
    const game = await this.prisma.client.casinoGame.findUnique({ where: { id } });
    if (!game) throw new NotFoundError('Game', id);
    const min = patch.minStakeMinor ? toBigInt(patch.minStakeMinor) : game.minStakeMinor;
    const max = patch.maxStakeMinor ? toBigInt(patch.maxStakeMinor) : game.maxStakeMinor;
    if (min > max)
      throw new DomainError('INVALID_STAKE_RANGE', 'Minimum stake cannot exceed maximum stake');
    const updated = await this.prisma.client.casinoGame.update({
      where: { id },
      data: {
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.featured !== undefined ? { featured: patch.featured } : {}),
        minStakeMinor: min,
        maxStakeMinor: max,
      },
      include: { _count: { select: { rounds: true } } },
    });
    return { ...toGameDto(updated), roundCount: updated._count.rounds };
  }

  private async walletDto(userId: string) {
    return toWalletDto(await this.prisma.client.wallet.findUniqueOrThrow({ where: { userId } }));
  }
}

export function toGameDto(g: CasinoGame): CasinoGameDto {
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    providerKey: g.providerKey,
    category: g.category,
    status: g.status,
    description: g.description,
    volatility: g.volatility,
    theoreticalRtpLabel: g.theoreticalRtpLabel,
    minStakeMinor: g.minStakeMinor.toString(),
    maxStakeMinor: g.maxStakeMinor.toString(),
    maxWinMultiplier: g.maxWinMultiplier,
    featured: g.featured,
    playable: g.playable,
    artwork: g.artwork as unknown as CasinoGameDto['artwork'],
    tags: g.tags,
  };
}

export function toSessionDto(s: GameSession & { game: Pick<CasinoGame, 'slug'> }): GameSessionDto {
  return {
    id: s.id,
    gameId: s.gameId,
    gameSlug: s.game.slug,
    status: s.status,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt?.toISOString() ?? null,
  };
}

export function toRoundDto(r: RoundWithGame): GameRoundDto {
  return {
    id: r.id,
    roundNumber: r.roundNumber.toString(),
    gameId: r.gameId,
    gameSlug: r.game.slug,
    gameName: r.game.name,
    sessionId: r.sessionId,
    stakeMinor: r.stakeMinor.toString(),
    payoutMinor: r.payoutMinor.toString(),
    netMinor: (r.payoutMinor - r.stakeMinor).toString(),
    status: r.status,
    input: r.input as unknown as GameRoundDto['input'],
    outcome: r.outcome as unknown as GameRoundDto['outcome'],
    stakeEntryId: r.stakeEntryId,
    payoutEntryId: r.payoutEntryId,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    ...(r.user ? { player: r.user } : {}),
  };
}
