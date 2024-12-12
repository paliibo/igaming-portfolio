import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@igaming/database';
import { PrismaService } from '../../common/prisma.service.js';
import { ConflictError } from '../../common/errors.js';

/**
 * Stores the first response for (scope, key) and replays it for retries with the same payload.
 * A retry with a different payload under the same key is rejected.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(
    params: { scope: string; key: string; userId?: string; payload: unknown },
    fn: () => Promise<T>,
  ): Promise<{ result: T; replayed: boolean }> {
    const requestHash = createHash('sha256').update(JSON.stringify(params.payload)).digest('hex');
    const existing = await this.prisma.client.idempotencyRecord.findUnique({
      where: { scope_key: { scope: params.scope, key: params.key } },
    });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ConflictError(
          'IDEMPOTENCY_MISMATCH',
          'This idempotency key was already used with a different request body',
        );
      }
      return { result: existing.responseBody as T, replayed: true };
    }
    const result = await fn();
    try {
      await this.prisma.client.idempotencyRecord.create({
        data: {
          scope: params.scope,
          key: params.key,
          userId: params.userId,
          requestHash,
          statusCode: 200,
          responseBody: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
        throw error;
    }
    return { result, replayed: false };
  }
}
