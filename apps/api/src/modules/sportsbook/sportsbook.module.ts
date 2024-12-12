import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SportsbookController } from './sportsbook.controller.js';
import { SportsbookOperatorController } from './sportsbook-operator.controller.js';
import { SportsbookService } from './sportsbook.service.js';
import { BettingService } from './betting.service.js';
import { SettlementService, SETTLEMENT_QUEUE } from './settlement.service.js';
import { SettlementProcessor } from './settlement.processor.js';
import { OddsSimulatorService } from './odds-simulator.service.js';
import { OperatorEventsService } from './operator-events.service.js';
import { RiskModule } from '../risk/risk.module.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [BullModule.registerQueue({ name: SETTLEMENT_QUEUE }), RiskModule, WalletModule],
  controllers: [SportsbookController, SportsbookOperatorController],
  providers: [
    SportsbookService,
    BettingService,
    SettlementService,
    SettlementProcessor,
    OddsSimulatorService,
    OperatorEventsService,
  ],
  exports: [SportsbookService, BettingService, SettlementService, OperatorEventsService],
})
export class SportsbookModule {}
