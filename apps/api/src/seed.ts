import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DemoDataService } from './modules/demo/demo-data.service.js';
import { installBigIntJson } from './common/serialization.js';

/**
 * `pnpm db:seed` — seeds demo data through the real services. Pass --reset to wipe first.
 */
async function main() {
  installBigIntJson();
  process.env['SIMULATOR_ENABLED'] = 'false';
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const demo = app.get(DemoDataService);
  const reset = process.argv.includes('--reset');
  if (!reset && (await demo.isSeeded())) {
    console.log('Database already contains data. Run with --reset to wipe and reseed.');
  } else {
    const summary = reset ? await demo.reset() : await demo.seed();
    console.log('Seeded:', JSON.stringify(summary));
  }
  await app.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
