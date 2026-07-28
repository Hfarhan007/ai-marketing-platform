import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { FilesRepository } from '../repositories/files.repository.js';
import { FILE_CLEANUP_QUEUE } from '../services/files.service.js';
import { StorageProviderRegistry } from '../storage/storage.providers.js';
@Injectable()
@Processor(FILE_CLEANUP_QUEUE)
export class OrphanCleanupProcessor extends WorkerHost {
  constructor(
    private readonly repository: FilesRepository,
    private readonly storage: StorageProviderRegistry,
  ) {
    super();
  }
  async process(job: Job): Promise<void> {
    if (job.name !== 'files.cleanup-orphans') return;
    for (const file of await this.repository.orphans(new Date())) {
      await this.storage.get().delete(file.storageKey);
      await this.repository.markPurged(String(file._id));
    }
  }
}
