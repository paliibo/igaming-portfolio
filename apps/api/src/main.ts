import { Logger } from '@nestjs/common';
import { createApp } from './bootstrap.js';
import { ENV, type Env } from './config/env.js';

async function main() {
  const app = await createApp();
  const env = app.get<Env>(ENV);
  await app.listen(env.API_PORT);
  new Logger('Bootstrap').log(
    `API listening on http://localhost:${env.API_PORT} (docs at /api/docs)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
