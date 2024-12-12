import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HealthDto } from '@igaming/contracts';
import { Public } from '../auth/public.decorator.js';
import { PrismaService } from '../../common/prisma.service.js';
import { RedisService } from '../../common/redis.provider.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + dependency readiness' })
  async health(): Promise<HealthDto> {
    const database = await this.prisma.client.$queryRaw`SELECT 1`
      .then(() => 'up' as const)
      .catch(() => 'down' as const);
    const redis = await this.redis.client
      .ping()
      .then(() => 'up' as const)
      .catch(() => 'down' as const);
    return {
      status: database === 'up' && redis === 'up' ? 'ok' : 'degraded',
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      checks: { database, redis },
    };
  }
}
