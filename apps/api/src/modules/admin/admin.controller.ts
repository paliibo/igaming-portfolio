import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  adjustmentSchema,
  adminBetsQuerySchema,
  adminJournalQuerySchema,
  adminRoundsQuerySchema,
  adminTransactionsQuerySchema,
  alertsQuerySchema,
  auditQuerySchema,
  createNoteSchema,
  playersQuerySchema,
  reportsQuerySchema,
  reverseEntrySchema,
  setLimitSchema,
  updateAlertSchema,
  updateKycSchema,
  updatePlayerStatusSchema,
  type AdjustmentInput,
  type SetLimitInput,
  type UpdatePlayerStatusInput,
} from '@igaming/contracts';
import type { Request } from 'express';
import type { z } from 'zod';
import { ZodBody, ZodQueryDocs, ZodValidationPipe } from '../../common/zod.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/request-context.js';
import { AdminService } from './admin.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import { RiskService } from '../risk/risk.service.js';
import { AuditService } from '../audit/audit.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { DemoDataService } from '../demo/demo-data.service.js';
import { ENV, type Env } from '../../config/env.js';
import { DomainError } from '../../common/errors.js';
import { toBigInt } from '../../common/money.js';

@ApiTags('admin')
@ApiCookieAuth()
@Roles('OPERATOR', 'ADMIN')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly wallet: WalletService,
    private readonly risk: RiskService,
    private readonly audit: AuditService,
    private readonly ledger: LedgerService,
    private readonly demo: DemoDataService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Operator dashboard metrics derived from the ledger' })
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('reports')
  @ZodQueryDocs(reportsQuerySchema)
  @ApiOperation({ summary: 'Daily financial report with explicit definitions' })
  reports(@Query(new ZodValidationPipe(reportsQuerySchema)) query: { days: number }) {
    return this.admin.reports(query.days);
  }

  @Get('players')
  @ZodQueryDocs(playersQuerySchema)
  listPlayers(
    @Query(new ZodValidationPipe(playersQuerySchema)) query: z.infer<typeof playersQuerySchema>,
  ) {
    return this.admin.listPlayers(query);
  }

  @Get('players/:id')
  @ApiParam({ name: 'id' })
  getPlayer(@Param('id') id: string) {
    return this.admin.getPlayer(id);
  }

  @Patch('players/:id/status')
  @ApiParam({ name: 'id' })
  @ZodBody(updatePlayerStatusSchema)
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: UpdatePlayerStatusInput,
    @Req() req: Request,
  ) {
    const profile = await this.admin.updatePlayerStatus(id, body);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: `player.status.${body.status.toLowerCase()}`,
      targetType: 'PLAYER',
      targetId: id,
      metadata: body as Record<string, unknown>,
      ip: req.ip,
    });
    return profile;
  }

  @Patch('players/:id/kyc')
  @ApiParam({ name: 'id' })
  @ZodBody(updateKycSchema)
  async updateKyc(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' },
    @Req() req: Request,
  ) {
    const profile = await this.admin.updateKyc(id, body.kycStatus);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'player.kyc',
      targetType: 'PLAYER',
      targetId: id,
      metadata: body,
      ip: req.ip,
    });
    return profile;
  }

  @Put('players/:id/limits')
  @ApiParam({ name: 'id' })
  @ZodBody(setLimitSchema)
  async setLimit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: SetLimitInput,
    @Req() req: Request,
  ) {
    await this.risk.setLimit(
      id,
      body.type,
      body.amountMinor === null ? null : toBigInt(body.amountMinor),
      user.id,
    );
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'player.limit',
      targetType: 'PLAYER',
      targetId: id,
      metadata: { type: body.type, amountMinor: body.amountMinor },
      ip: req.ip,
    });
    return this.risk.listLimits(id);
  }

  @Post('players/:id/notes')
  @ApiParam({ name: 'id' })
  @ZodBody(createNoteSchema)
  async addNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { body: string },
    @Req() req: Request,
  ) {
    const note = await this.admin.addNote(id, user.id, body.body);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'player.note',
      targetType: 'PLAYER',
      targetId: id,
      metadata: { noteId: note.id },
      ip: req.ip,
    });
    return note;
  }

  @Post('players/:id/adjustments')
  @Roles('ADMIN')
  @ApiParam({ name: 'id' })
  @ZodBody(adjustmentSchema)
  @ApiOperation({ summary: 'Manual balance adjustment (ADMIN only, idempotent, audited)' })
  async adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: AdjustmentInput,
    @Req() req: Request,
  ) {
    const result = await this.wallet.adjust({ userId: id, ...body, actorId: user.id });
    if (!result.replayed) {
      await this.audit.record({
        actorId: user.id,
        actorEmail: user.email,
        action: 'wallet.adjust',
        targetType: 'PLAYER',
        targetId: id,
        metadata: {
          direction: body.direction,
          amountMinor: body.amountMinor,
          reason: body.reason,
          entryId: result.transaction.entryId,
        },
        ip: req.ip,
      });
    }
    return result;
  }

  @Get('transactions')
  @ZodQueryDocs(adminTransactionsQuerySchema)
  listTransactions(
    @Query(new ZodValidationPipe(adminTransactionsQuerySchema))
    query: z.infer<typeof adminTransactionsQuerySchema>,
  ) {
    return this.admin.listTransactions(query);
  }

  @Get('journal')
  @ZodQueryDocs(adminJournalQuerySchema)
  listJournal(
    @Query(new ZodValidationPipe(adminJournalQuerySchema))
    query: z.infer<typeof adminJournalQuerySchema>,
  ) {
    return this.admin.listJournal(query);
  }

  @Get('journal/:id')
  @ApiParam({ name: 'id' })
  getJournalEntry(@Param('id') id: string) {
    return this.admin.getJournalEntry(id);
  }

  @Post('journal/:id/reverse')
  @Roles('ADMIN')
  @ApiParam({ name: 'id' })
  @ZodBody(reverseEntrySchema)
  @ApiOperation({ summary: 'Reverse a journal entry with a mirrored posting (ADMIN only)' })
  async reverse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: Request,
  ) {
    const result = await this.wallet.reverseEntry(id, body.reason, user.id);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'journal.reverse',
      targetType: 'JOURNAL_ENTRY',
      targetId: id,
      metadata: { reason: body.reason, reversalEntryId: result.entryId },
      ip: req.ip,
    });
    return this.admin.getJournalEntry(result.entryId);
  }

  @Get('ledger/accounts')
  @ApiOperation({ summary: 'Ledger account balances' })
  ledgerAccounts() {
    return this.admin.ledgerAccounts();
  }

  @Get('ledger/reconciliation')
  @ApiOperation({
    summary: 'Checks every journal entry balances and cached wallet balances match the ledger',
  })
  reconciliation() {
    return this.ledger.reconcile();
  }

  @Get('bets')
  @ZodQueryDocs(adminBetsQuerySchema)
  listBets(
    @Query(new ZodValidationPipe(adminBetsQuerySchema)) query: z.infer<typeof adminBetsQuerySchema>,
  ) {
    return this.admin.listBets(query);
  }

  @Get('rounds')
  @ZodQueryDocs(adminRoundsQuerySchema)
  listRounds(
    @Query(new ZodValidationPipe(adminRoundsQuerySchema))
    query: z.infer<typeof adminRoundsQuerySchema>,
  ) {
    return this.admin.listRounds(query);
  }

  @Get('risk/alerts')
  @ZodQueryDocs(alertsQuerySchema)
  listAlerts(
    @Query(new ZodValidationPipe(alertsQuerySchema)) query: z.infer<typeof alertsQuerySchema>,
  ) {
    return this.admin.listAlerts(query);
  }

  @Patch('risk/alerts/:id')
  @ApiParam({ name: 'id' })
  @ZodBody(updateAlertSchema)
  async updateAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status: 'RESOLVED' | 'DISMISSED' },
    @Req() req: Request,
  ) {
    const alert = await this.admin.updateAlert(id, body.status, user.id);
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: `risk.alert.${body.status.toLowerCase()}`,
      targetType: 'RISK_ALERT',
      targetId: id,
      ip: req.ip,
    });
    return alert;
  }

  @Get('audit')
  @ZodQueryDocs(auditQuerySchema)
  listAudit(
    @Query(new ZodValidationPipe(auditQuerySchema)) query: z.infer<typeof auditQuerySchema>,
  ) {
    return this.admin.listAudit(query);
  }

  @Post('demo/reset')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Development only: wipe and reseed demo data (disabled in production)' })
  async resetDemo(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    if (!this.env.demoResetEnabled)
      throw new DomainError(
        'DEMO_RESET_DISABLED',
        'Demo reset is disabled in this environment',
        403,
      );
    const summary = await this.demo.reset();
    await this.audit.record({
      actorId: user.id,
      actorEmail: user.email,
      action: 'demo.reset',
      targetType: 'SYSTEM',
      metadata: { ...summary },
      ip: req.ip,
    });
    return summary;
  }
}
