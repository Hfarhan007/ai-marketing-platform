import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';
import {
  DATA_LIFECYCLE_QUEUE,
  DataLifecycleService,
} from '../data-lifecycle.service.js';
import type { LifecycleJob } from '../data-lifecycle.types.js';

@Injectable()
@Processor(DATA_LIFECYCLE_QUEUE, { concurrency: 2 })
export class DataLifecycleProcessor extends WorkerHost {
  constructor(private readonly lifecycle: DataLifecycleService) {
    super();
  }
  process(job: Job<LifecycleJob>) {
    if (job.name === 'data-lifecycle.schedule-all') return this.lifecycle.scheduleAll(false);
    if (!job.data.manifestId) throw new Error('Lifecycle manifest ID is required');
    return this.lifecycle.execute(job.data.manifestId, job.data.workspaceId);
  }
}

@Injectable()
export class DataLifecycleScheduler implements OnModuleInit {
  constructor(@InjectQueue(DATA_LIFECYCLE_QUEUE) private readonly queue: Queue<LifecycleJob>) {}
  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'daily-data-lifecycle',
      { pattern: '17 2 * * *' },
      {
        name: 'data-lifecycle.schedule-all',
        data: { workspaceId: 'platform', requestedBy: 'system', dryRun: false },
      },
    );
  }
}
