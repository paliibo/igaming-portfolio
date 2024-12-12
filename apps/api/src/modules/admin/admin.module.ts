import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { RiskModule } from '../risk/risk.module.js';
import { DemoModule } from '../demo/demo.module.js';

@Module({
  imports: [WalletModule, RiskModule, DemoModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
