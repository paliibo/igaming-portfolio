import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Logger } from 'pino';
import { Prisma } from '@igaming/database';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'string'
          ? { statusCode: status, code: codeFromStatus(status), message: body }
          : { statusCode: status, code: codeFromStatus(status), ...(body as object) };
      if (status >= 500) this.logger.error({ err: exception, path: req.url }, 'request failed');
      res.status(status).json(payload);
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      res.status(HttpStatus.CONFLICT).json({
        statusCode: 409,
        code: 'DUPLICATE',
        message: 'A record with the same unique key already exists',
      });
      return;
    }

    this.logger.error({ err: exception, path: req.url }, 'unhandled exception');
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
}

function codeFromStatus(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'ERROR';
  }
}
