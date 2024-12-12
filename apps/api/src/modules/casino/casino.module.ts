import { Module } from '@nestjs/common';
import { CasinoController } from './casino.controller.js';
import { CasinoOperatorController } from './casino-operator.controller.js';
import { CasinoService } from './casino.service.js';
import { DemoProviderAdapter } from './providers/demo/demo-provider.adapter.js';
import { GAME_PROVIDERS } from './providers/provider.interface.js';
import { CryptoRandomSource, RANDOM_SOURCE } from './providers/random-source.js';
import { RiskModule } from '../risk/risk.module.js';
import { WalletModule } from '../wallet/wallet.module.js';

@Module({
  imports: [RiskModule, WalletModule],
  controllers: [CasinoController, CasinoOperatorController],
  providers: [
    CasinoService,
    DemoProviderAdapter,
    {
      provide: GAME_PROVIDERS,
      useFactory: (demo: DemoProviderAdapter) => [demo],
      inject: [DemoProviderAdapter],
    },
    { provide: RANDOM_SOURCE, useClass: CryptoRandomSource },
  ],
  exports: [CasinoService],
})
export class CasinoModule {}
