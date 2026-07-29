import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { SagaRepository } from '../repositories/saga.repository.js';
import { SAGA_MONITOR_QUEUE, SAGA_QUEUE, SagaService } from '../saga.service.js';
import type { SagaJob } from '../saga.types.js';

@Injectable()
@Processor(SAGA_QUEUE, { concurrency: 20 })
export class SagaProcessor extends WorkerHost {
  constructor(private readonly sagas: SagaService) {
    super();
  }
  process(job: Job<SagaJob>) {
    return this.sagas.advance(job.data.workspaceId, job.data.sagaId);
  }
}

@Injectable()
export class StuckSagaDetector implements OnModuleInit {
  private readonly logger = new Logger(StuckSagaDetector.name);
  constructor(
    private readonly repository: SagaRepository,
    @InjectQueue(SAGA_MONITOR_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'saga-stuck-detection',
      { every: 60_000 },
      { name: 'saga.detect-stuck', data: {} },
    );
  }

  async detect(stuckAfterMs = 5 * 60_000) {
    const stuck = await this.repository.stuck(new Date(Date.now() - stuckAfterMs));
    for (const saga of stuck) {
      const message = `Saga ${String(saga._id)} has made no progress since ${saga.lastProgressAt?.toISOString() ?? 'unknown'}`;
      await this.repository.alert(saga, 'stuck', message);
      this.logger.warn({
        metric: 'saga_stuck_total',
        sagaId: String(saga._id),
        workspaceId: String(saga.workspaceId),
        type: saga.type,
        status: saga.status,
        message,
      });
    }
    return { stuck: stuck.length };
  }
}

@Injectable()
@Processor(SAGA_MONITOR_QUEUE)
export class SagaMonitorProcessor extends WorkerHost {
  constructor(private readonly detector: StuckSagaDetector) {
    super();
  }
  process() {
    return this.detector.detect();
  }
}
