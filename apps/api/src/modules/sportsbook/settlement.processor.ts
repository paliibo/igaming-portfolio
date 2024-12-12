import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { SETTLEMENT_QUEUE, SettlementService, type SettlementJob } from './settlement.service.js';

@Processor(SETTLEMENT_QUEUE, { concurrency: 1 })
export class SettlementProcessor extends WorkerHost {
  private readonly logger = new Logger(SettlementProcessor.name);

  constructor(private readonly settlement: SettlementService) {
    super();
  }

  async process(job: Job<SettlementJob>) {
    this.logger.log(`processing ${job.name} ${job.id} (attempt ${job.attemptsMade + 1})`);
    return this.settlement.settleEvent(job.data);
  }
}
