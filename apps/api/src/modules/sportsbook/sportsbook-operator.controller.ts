import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  createEventSchema,
  eventsQuerySchema,
  settleEventSchema,
  updateEventStateSchema,
  updateMarketStatusSchema,
  updateSelectionPriceSchema,
  type CreateEventInput,
  type SettleEventInput,
  type UpdateEventStateInput,
} from '@igaming/contracts';
import type { Request } from 'express';
import { ZodBody, ZodQueryDocs, ZodValidationPipe } from '../../common/zod.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/request-context.js';
import { SportsbookService } from './sportsbook.service.js';
import { SettlementService } from './settlement.service.js';
import { OperatorEventsService } from './operator-events.service.js';
import { AuditService } from '../audit/audit.service.js';

@ApiTags('sportsbook-operator')
@ApiCookieAuth()
@Roles('OPERATOR', 'ADMIN')
@Controller('sportsbook/operator')
export class SportsbookOperatorController {
  constructor(
    private readonly sportsbook: SportsbookService,
    private readonly operatorEvents: OperatorEventsService,
    private readonly settlement: SettlementService,
    private readonly audit: AuditService,
  ) {}

  @Get('events')
  @ZodQueryDocs(eventsQuerySchema)
  @ApiOperation({ summary: 'All events including finished/settled, with bet counts' })
  listEvents(
    @Query(new ZodValidationPipe(eventsQuerySchema))
    query: {
      sport?: string;
      status: 'upcoming' | 'live' | 'finished' | 'all';
      featured?: boolean;
    },
  ) {
    return this.sportsbook.listEvents(query, true);
  }

  @Post('events')
  @ZodBody(createEventSchema)
  @ApiOperation({ summary: 'Create a demo fixture with a default market set' })
  async createEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateEventInput,
    @Req() req: Request,
  ) {
    const event = await this.operatorEvents.createEvent(body);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'event.create',
      targetType: 'EVENT',
      targetId: event.id,
      metadata: { homeTeam: event.homeTeam, awayTeam: event.awayTeam },
      ip: req.ip,
    });
    return event;
  }

  @Patch('events/:id')
  @ApiParam({ name: 'id' })
  @ZodBody(updateEventStateSchema)
  @ApiOperation({ summary: 'Update event status / score / clock' })
  async updateEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateEventStateInput,
    @Req() req: Request,
  ) {
    const event = await this.operatorEvents.updateEventState(id, body);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'event.update',
      targetType: 'EVENT',
      targetId: id,
      metadata: body as Record<string, unknown>,
      ip: req.ip,
    });
    return event;
  }

  @Patch('markets/:id')
  @ApiParam({ name: 'id' })
  @ZodBody(updateMarketStatusSchema)
  @ApiOperation({ summary: 'Open, suspend or close a market' })
  async updateMarket(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status: 'OPEN' | 'SUSPENDED' | 'CLOSED' },
    @Req() req: Request,
  ) {
    const market = await this.operatorEvents.updateMarketStatus(id, body.status);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'market.status',
      targetType: 'MARKET',
      targetId: id,
      metadata: { status: body.status },
      ip: req.ip,
    });
    return market;
  }

  @Patch('selections/:id/price')
  @ApiParam({ name: 'id' })
  @ZodBody(updateSelectionPriceSchema)
  @ApiOperation({ summary: 'Manually set a selection price' })
  async updatePrice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { priceMilli: number },
    @Req() req: Request,
  ) {
    const selection = await this.operatorEvents.updateSelectionPrice(id, body.priceMilli);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'selection.price',
      targetType: 'SELECTION',
      targetId: id,
      metadata: { priceMilli: body.priceMilli },
      ip: req.ip,
    });
    return selection;
  }

  @Post('events/:id/settle')
  @ApiParam({ name: 'id' })
  @ZodBody(settleEventSchema)
  @ApiOperation({
    summary: 'Settle an event with a final score (processed by the settlement worker)',
  })
  async settle(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SettleEventInput,
    @Req() req: Request,
  ) {
    await this.operatorEvents.markFinished(id, body);
    const jobId = await this.settlement.enqueue({
      eventId: id,
      homeScore: body.homeScore,
      awayScore: body.awayScore,
      requestedBy: user.id,
    });
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'event.settle',
      targetType: 'EVENT',
      targetId: id,
      metadata: { ...body, jobId },
      ip: req.ip,
    });
    return { jobId, eventId: id, queued: true };
  }

  @Post('events/:id/cancel')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Cancel an event and refund every open bet' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const summary = await this.settlement.cancelEvent(id, user.id);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'event.cancel',
      targetType: 'EVENT',
      targetId: id,
      metadata: { ...summary },
      ip: req.ip,
    });
    return summary;
  }
}
