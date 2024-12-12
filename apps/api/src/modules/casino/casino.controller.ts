import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  createSessionSchema,
  gamesQuerySchema,
  playRoundSchema,
  roundsQuerySchema,
  type PlayRoundInput,
} from '@igaming/contracts';
import { ZodBody, ZodQueryDocs, ZodValidationPipe } from '../../common/zod.js';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard.js';
import { Public } from '../auth/public.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/request-context.js';
import { CasinoService } from './casino.service.js';

@ApiTags('casino')
@Controller('casino')
export class CasinoController {
  constructor(private readonly casino: CasinoService) {}

  @Public()
  @Get('games')
  @ZodQueryDocs(gamesQuerySchema)
  @ApiOperation({ summary: 'Game catalogue (favourites flagged when signed in)' })
  listGames(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query(new ZodValidationPipe(gamesQuerySchema))
    query: { category?: string; search?: string; featured?: boolean },
  ) {
    return this.casino.listGames(query, user?.id);
  }

  @Public()
  @Get('games/:slug')
  @ApiParam({ name: 'slug' })
  @ApiOperation({ summary: 'Game detail, rules/paytable and the player’s recent rounds' })
  getGame(@CurrentUser() user: AuthenticatedUser | undefined, @Param('slug') slug: string) {
    return this.casino.getGame(slug, user?.id);
  }

  @Get('favorites')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Favourite games' })
  listFavorites(@CurrentUser() user: AuthenticatedUser) {
    return this.casino.listFavorites(user.id);
  }

  @Put('favorites/:gameId')
  @ApiCookieAuth()
  @ApiParam({ name: 'gameId' })
  @ApiOperation({ summary: 'Add a game to favourites' })
  addFavorite(@CurrentUser() user: AuthenticatedUser, @Param('gameId') gameId: string) {
    return this.casino.setFavorite(user.id, gameId, true);
  }

  @Delete('favorites/:gameId')
  @ApiCookieAuth()
  @ApiParam({ name: 'gameId' })
  @ApiOperation({ summary: 'Remove a game from favourites' })
  removeFavorite(@CurrentUser() user: AuthenticatedUser, @Param('gameId') gameId: string) {
    return this.casino.setFavorite(user.id, gameId, false);
  }

  @Post('sessions')
  @ApiCookieAuth()
  @ZodBody(createSessionSchema)
  @ApiOperation({ summary: 'Open a game session through the provider adapter' })
  createSession(@CurrentUser() user: AuthenticatedUser, @Body() body: { gameSlug: string }) {
    return this.casino.createSession(user.id, body.gameSlug);
  }

  @Post('sessions/:id/close')
  @ApiCookieAuth()
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Close a game session' })
  closeSession(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.casino.closeSession(user.id, id);
  }

  @Post('rounds')
  @ApiCookieAuth()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 60, windowSeconds: 60, name: 'play-round' })
  @ZodBody(playRoundSchema)
  @ApiOperation({
    summary: 'Play one round (atomic stake debit + payout credit, idempotent by clientRoundKey)',
  })
  playRound(@CurrentUser() user: AuthenticatedUser, @Body() body: PlayRoundInput) {
    return this.casino.playRound(user.id, body);
  }

  @Get('rounds')
  @ApiCookieAuth()
  @ZodQueryDocs(roundsQuerySchema)
  @ApiOperation({ summary: 'My game history' })
  listRounds(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(roundsQuerySchema))
    query: { gameSlug?: string; cursor?: string; limit: number },
  ) {
    return this.casino.listRounds(user.id, query);
  }

  @Get('rounds/:id')
  @ApiCookieAuth()
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Single round' })
  getRound(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.casino.getRound(user.id, id);
  }
}
