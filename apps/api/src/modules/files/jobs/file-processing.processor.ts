import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import { fileTypeFromBuffer } from 'file-type';
import { imageSize } from 'image-size';
import { FilesRepository } from '../repositories/files.repository.js';
import { StorageProviderRegistry } from '../storage/storage.providers.js';
import { MockMalwareScanner } from '../virus-scan/malware-scanner.js';
import { FilePolicyService } from '../services/file-policy.service.js';
import { FILE_PROCESSING_QUEUE } from '../services/files.service.js';
interface FileJob {
  workspaceId: string;
  fileId: string;
}
@Injectable()
@Processor(FILE_PROCESSING_QUEUE, { concurrency: 5 })
export class FileProcessingProcessor extends WorkerHost {
  constructor(
    private readonly repository: FilesRepository,
    private readonly storage: StorageProviderRegistry,
    private readonly scanner: MockMalwareScanner,
    private readonly policy: FilePolicyService,
  ) {
    super();
  }
  async process(job: Job<FileJob>) {
    const file = await this.repository.get(job.data.workspaceId, job.data.fileId),
      content = await this.storage.get().read(file.storageKey, 52_428_800);
    await this.repository.update(
      job.data.workspaceId,
      job.data.fileId,
      { status: 'pending' },
      { $set: { processingStatus: 'processing' } },
    );
    const detected = await fileTypeFromBuffer(content),
      mime =
        detected?.mime ??
        (file.extension === '.txt' || file.extension === '.csv' ? 'text/plain' : '');
    try {
      this.policy.validateDetected(file.extension, mime);
    } catch (error) {
      await this.storage.get().delete(file.storageKey);
      await this.repository.update(
        job.data.workspaceId,
        job.data.fileId,
        {},
        { $set: { status: 'quarantined', scanStatus: 'failed', processingStatus: 'failed' } },
      );
      throw error;
    }
    const scan = await this.scanner.scan(content);
    if (!scan.clean) {
      await this.storage.get().delete(file.storageKey);
      await this.repository.update(
        job.data.workspaceId,
        job.data.fileId,
        {},
        { $set: { status: 'quarantined', scanStatus: 'infected', processingStatus: 'failed' } },
      );
      return;
    }
    let dimensions: null | { width: number; height: number } = null;
    if (mime.startsWith('image/')) {
      const value = imageSize(content);
      if (value.width && value.height) dimensions = { width: value.width, height: value.height };
    }
    await this.repository.update(
      job.data.workspaceId,
      job.data.fileId,
      { status: 'pending' },
      {
        $set: {
          status: 'active',
          scanStatus: 'clean',
          processingStatus: 'completed',
          mimeType: mime,
          dimensions,
        },
      },
    );
  }
}
