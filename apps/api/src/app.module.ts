import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from './config/config.module.js';
import { ENV, type Env } from './config/env.js';
import { CommonModule } from './common/common.module.js';
import { RateLimitGuard } from './common/rate-limit.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AuthGuard } from './modules/auth/auth.guard.js';
import { RolesGuard } from './modules/auth/roles.guard.js';
import { OriginGuard } from './modules/auth/origin.guard.js';
import { UsersModule } from './modules/users/users.module.js';
import { LedgerModule } from './modules/ledger/ledger.module.js';
import { WalletModule } from './modules/wallet/wallet.module.js';
import { RiskModule } from './modules/risk/risk.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { SportsbookModule } from './modules/sportsbook/sportsbook.module.js';
import { CasinoModule } from './modules/casino/casino.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { DemoModule } from './modules/demo/demo.module.js';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    BullModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => {
        const url = new URL(env.REDIS_URL);
        return {
          prefix: env.isTest ? 'igaming-test' : 'igaming',
          connection: {
            host: url.hostname,
            port: Number(url.port || 6379),
            ...(url.password ? { password: url.password } : {}),
          },
        };
      },
    }),
    LedgerModule,
    AuditModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    WalletModule,
    RiskModule,
    SportsbookModule,
    CasinoModule,
    DemoModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    RateLimitGuard,
  ],
})
export class AppModule {}
