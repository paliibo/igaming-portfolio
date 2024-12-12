import { Global, Module } from '@nestjs/common';
import { ENV, loadEnvConfig } from './env.js';

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnvConfig() }],
  exports: [ENV],
})
export class ConfigModule {}
