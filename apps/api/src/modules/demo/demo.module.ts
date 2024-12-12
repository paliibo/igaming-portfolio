import { Module } from '@nestjs/common';
import { DemoDataService } from './demo-data.service.js';
import { UsersModule } from '../users/users.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { SportsbookModule } from '../sportsbook/sportsbook.module.js';
import { CasinoModule } from '../casino/casino.module.js';
import { RiskModule } from '../risk/risk.module.js';

@Module({
  imports: [UsersModule, WalletModule, SportsbookModule, CasinoModule, RiskModule],
  providers: [DemoDataService],
  exports: [DemoDataService],
})
export class DemoModule {}
