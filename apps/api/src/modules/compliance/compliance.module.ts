import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '../../cache/cache.module.js';
import { FilesModule } from '../files/files.module.js';
import { DataLifecycleController } from './controllers/data-lifecycle.controller.js';
import {
  DATA_LIFECYCLE_QUEUE,
  DataLifecycleService,
} from './data-lifecycle.service.js';
import { DataLifecycleRepository } from './repositories/data-lifecycle.service.js';
import {
  DataLifecycleProcessor,
  DataLifecycleScheduler,
} from './jobs/data-lifecycle.processor.js';
import {
  DataDeletionManifest,
  DataDeletionManifestSchema,
  DataLegalHold,
  DataLegalHoldSchema,
  DataLifecyclePolicy,
  DataLifecyclePolicySchema,
  DataLifecycleRecord,
  DataLifecycleRecordSchema,
} from './schemas/data-lifecycle.schemas.js';

@Module({
  imports: [
    CacheModule,
    FilesModule,
    BullModule.registerQueue({ name: DATA_LIFECYCLE_QUEUE }),
    MongooseModule.forFeature([
      { name: DataLifecyclePolicy.name, schema: DataLifecyclePolicySchema },
      { name: DataLegalHold.name, schema: DataLegalHoldSchema },
      { name: DataDeletionManifest.name, schema: DataDeletionManifestSchema },
      { name: DataLifecycleRecord.name, schema: DataLifecycleRecordSchema },
    ]),
  ],
  controllers: [DataLifecycleController],
  providers: [
    DataLifecycleRepository,
    DataLifecycleService,
    DataLifecycleProcessor,
    DataLifecycleScheduler,
  ],
  exports: [DataLifecycleService],
})
export class ComplianceModule {}
