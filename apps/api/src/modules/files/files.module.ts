import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilesController } from './controllers/files.controller.js';
import { FileProcessingProcessor } from './jobs/file-processing.processor.js';
import { OrphanCleanupProcessor } from './jobs/orphan-cleanup.processor.js';
import { OrphanCleanupScheduler } from './jobs/orphan-cleanup.scheduler.js';
import { FilesRepository } from './repositories/files.repository.js';
import { StoredFile, StoredFileSchema } from './schemas/file.schema.js';
import { FilePolicyService } from './services/file-policy.service.js';
import {
  FILE_CLEANUP_QUEUE,
  FILE_PROCESSING_QUEUE,
  FilesService,
} from './services/files.service.js';
import {
  LocalStorageProvider,
  S3StorageProvider,
  StorageProviderRegistry,
} from './storage/storage.providers.js';
import { MockMalwareScanner } from './virus-scan/malware-scanner.js';
@Module({
  imports: [
    BullModule.registerQueue({ name: FILE_PROCESSING_QUEUE }, { name: FILE_CLEANUP_QUEUE }),
    MongooseModule.forFeature([{ name: StoredFile.name, schema: StoredFileSchema }]),
  ],
  controllers: [FilesController],
  providers: [
    FilesRepository,
    FilePolicyService,
    LocalStorageProvider,
    S3StorageProvider,
    StorageProviderRegistry,
    MockMalwareScanner,
    FilesService,
    FileProcessingProcessor,
    OrphanCleanupProcessor,
    OrphanCleanupScheduler,
  ],
  exports: [FilesService, StorageProviderRegistry],
})
export class FilesModule {}
