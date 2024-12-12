import { Injectable, type LoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';

export function createRootLogger(level: string, pretty: boolean): Logger {
  return pino({
    level,
    base: { service: 'igaming-api' },
    ...(pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
          },
        }
      : {}),
  });
}

@Injectable()
export class AppLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  child(bindings: Record<string, unknown>): Logger {
    return this.logger.child(bindings);
  }

  log(message: unknown, context?: string) {
    this.logger.info({ context }, String(message));
  }
  error(message: unknown, trace?: string, context?: string) {
    this.logger.error({ context, trace }, String(message));
  }
  warn(message: unknown, context?: string) {
    this.logger.warn({ context }, String(message));
  }
  debug(message: unknown, context?: string) {
    this.logger.debug({ context }, String(message));
  }
  verbose(message: unknown, context?: string) {
    this.logger.trace({ context }, String(message));
  }
  fatal(message: unknown, context?: string) {
    this.logger.fatal({ context }, String(message));
  }
}
