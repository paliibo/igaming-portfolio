import { forwardRef, Module } from '@nestjs/common';
import { WalletController } from './wallet.controller.js';
import { WalletService } from './wallet.service.js';
import { IdempotencyService } from './idempotency.service.js';
import { RiskModule } from '../risk/risk.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';

@Module({
  imports: [forwardRef(() => RiskModule), AuditModule, RealtimeModule],
  controllers: [WalletController],
  providers: [WalletService, IdempotencyService],
  exports: [WalletService, IdempotencyService],
})
export class WalletModule {}
