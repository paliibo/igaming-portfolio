import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { createPrismaClient, type PrismaClient } from '@igaming/database';
import { ENV, type Env } from '../config/env.js';

export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
export type DbClient = PrismaClient | Tx;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(@Inject(ENV) env: Env) {
    this.client = createPrismaClient(env.DATABASE_URL, !env.isTest);
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
