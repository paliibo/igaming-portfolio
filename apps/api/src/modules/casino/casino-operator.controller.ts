import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { updateGameSchema, type UpdateGameInput } from '@igaming/contracts';
import type { Request } from 'express';
import { ZodBody } from '../../common/zod.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/request-context.js';
import { CasinoService } from './casino.service.js';
import { AuditService } from '../audit/audit.service.js';

@ApiTags('casino-operator')
@ApiCookieAuth()
@Roles('OPERATOR', 'ADMIN')
@Controller('casino/operator')
export class CasinoOperatorController {
  constructor(
    private readonly casino: CasinoService,
    private readonly audit: AuditService,
  ) {}

  @Get('games')
  @ApiOperation({ summary: 'Full catalogue including disabled games' })
  listGames() {
    return this.casino.listGames({}, undefined, true);
  }

  @Patch('games/:id')
  @ApiParam({ name: 'id' })
  @ZodBody(updateGameSchema)
  @ApiOperation({ summary: 'Update game status, featured flag or stake limits' })
  async updateGame(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdateGameInput,
    @Req() req: Request,
  ) {
    const game = await this.casino.updateGame(id, body);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'game.update',
      targetType: 'GAME',
      targetId: id,
      metadata: body as Record<string, unknown>,
      ip: req.ip,
    });
    return game;
  }
}
