import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  betsQuerySchema,
  eventsQuerySchema,
  placeBetSchema,
  type PlaceBetInput,
} from '@igaming/contracts';
import { ZodBody, ZodQueryDocs, ZodValidationPipe } from '../../common/zod.js';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard.js';
import { Public } from '../auth/public.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/request-context.js';
import { SportsbookService } from './sportsbook.service.js';
import { BettingService } from './betting.service.js';

@ApiTags('sportsbook')
@Controller('sportsbook')
export class SportsbookController {
  constructor(
    private readonly sportsbook: SportsbookService,
    private readonly betting: BettingService,
  ) {}

  @Public()
  @Get('sports')
  @ApiOperation({ summary: 'Sports with upcoming event counts' })
  listSports() {
    return this.sportsbook.listSports();
  }

  @Public()
  @Get('events')
  @ZodQueryDocs(eventsQuerySchema)
  @ApiOperation({ summary: 'Events with markets and current prices' })
  listEvents(
    @Query(new ZodValidationPipe(eventsQuerySchema))
    query: {
      sport?: string;
      status: 'upcoming' | 'live' | 'finished' | 'all';
      featured?: boolean;
    },
  ) {
    return this.sportsbook.listEvents(query);
  }

  @Public()
  @Get('events/:id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Event detail with all markets' })
  getEvent(@Param('id') id: string) {
    return this.sportsbook.getEvent(id);
  }

  @Post('bets')
  @ApiCookieAuth()
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 30, windowSeconds: 60, name: 'place-bet' })
  @ZodBody(placeBetSchema)
  @ApiOperation({
    summary: 'Place a bet (atomic wallet debit, idempotent, rejects stale odds unless accepted)',
  })
  placeBet(@CurrentUser() user: AuthenticatedUser, @Body() body: PlaceBetInput) {
    return this.betting.placeBet(user.id, body);
  }

  @Get('bets')
  @ApiCookieAuth()
  @ZodQueryDocs(betsQuerySchema)
  @ApiOperation({ summary: 'My bets' })
  listBets(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(betsQuerySchema))
    query: { status: 'open' | 'settled' | 'all'; cursor?: string; limit: number },
  ) {
    return this.betting.listBets(user.id, query);
  }

  @Get('bets/:id')
  @ApiCookieAuth()
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Single bet detail' })
  getBet(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.betting.getBet(user.id, id);
  }
}
