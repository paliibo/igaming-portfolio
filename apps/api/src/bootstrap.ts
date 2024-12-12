import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { ENV, type Env } from './config/env.js';
import { AllExceptionsFilter } from './common/http-exception.filter.js';
import { AppLogger, createRootLogger } from './common/logger.js';
import { installBigIntJson } from './common/serialization.js';
import { LedgerService } from './modules/ledger/ledger.service.js';

export async function createApp(): Promise<NestExpressApplication> {
  installBigIntJson();
  const rootLogger = createRootLogger(
    process.env['LOG_LEVEL'] ?? 'info',
    process.env['NODE_ENV'] !== 'production' && process.env['NODE_ENV'] !== 'test',
  );
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new AppLogger(rootLogger),
    bufferLogs: true,
  });
  const env = app.get<Env>(ENV);

  app.set('trust proxy', 1);
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: env.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter(rootLogger));
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('iGaming Portfolio API')
    .setDescription(
      'Shared backend for LinePulse (sportsbook), SpinHarbor (casino) and LedgerArc (wallet & operations). Demo currency only.',
    )
    .setVersion('0.1.0')
    .addCookieAuth(env.SESSION_COOKIE_NAME)
    .build();
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config), {
    jsonDocumentUrl: 'api/docs-json',
  });

  await app.get(LedgerService).ensureSystemAccounts();
  return app;
}
