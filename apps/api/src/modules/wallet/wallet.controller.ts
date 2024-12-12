import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { topupSchema, walletTransactionsQuerySchema, type TopupInput } from '@igaming/contracts';
import type { Request } from 'express';
import { ZodBody, ZodQueryDocs, ZodValidationPipe } from '../../common/zod.js';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/request-context.js';
import { WalletService } from './wallet.service.js';
import { AuditService } from '../audit/audit.service.js';

@ApiTags('wallet')
@ApiCookieAuth()
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly wallet: WalletService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Current player wallet balance' })
  getWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.wallet.getWallet(user.id);
  }

  @Get('transactions')
  @ZodQueryDocs(walletTransactionsQuerySchema)
  @ApiOperation({ summary: 'Player wallet transaction history (cursor paginated)' })
  listTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(walletTransactionsQuerySchema))
    query: { cursor?: string; limit: number; kind?: string },
  ) {
    return this.wallet.listTransactions(user.id, query);
  }

  @Post('topup')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 60, name: 'topup' })
  @ZodBody(topupSchema)
  @ApiOperation({ summary: 'Demo-only virtual credit top-up (idempotent)' })
  async topUp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: TopupInput,
    @Req() req: Request,
  ) {
    const result = await this.wallet.topUp(user.id, body.amountMinor, body.idempotencyKey);
    if (!result.replayed) {
      await this.audit.record({
        actorId: user.id,
        actorEmail: user.email,
        action: 'wallet.topup',
        targetType: 'WALLET',
        targetId: result.wallet.id,
        metadata: { amountMinor: body.amountMinor },
        ip: req.ip,
      });
    }
    return result;
  }
}
