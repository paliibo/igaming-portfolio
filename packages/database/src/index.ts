import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export * from './generated/prisma/client.js';
export * from './generated/prisma/enums.js';
export type * from './generated/prisma/models.js';

export function createPrismaClient(connectionString: string, log: boolean = false): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter, log: log ? ['warn', 'error'] : [] });
}
