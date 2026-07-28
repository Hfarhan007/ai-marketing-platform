import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { FILE_CLEANUP_QUEUE } from '../services/files.service.js';
@Injectable()
export class OrphanCleanupScheduler implements OnModuleInit {
  constructor(@InjectQueue(FILE_CLEANUP_QUEUE) private readonly queue: Queue) {}
  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      'files-orphan-cleanup',
      { every: 3_600_000 },
      { name: 'files.cleanup-orphans', data: {} },
    );
  }
}
