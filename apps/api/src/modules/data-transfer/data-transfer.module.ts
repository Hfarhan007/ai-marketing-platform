import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmModule } from '../crm/crm.module.js';
import { FilesModule } from '../files/files.module.js';
import { DataTransferController } from './data-transfer.controller.js';
import { DataExportProcessor, DataImportProcessor } from './jobs/data-transfer.processors.js';
import { DataTransferRepository } from './repositories/data-transfer.repository.js';
import { DataTransferRowsRepository } from './repositories/data-transfer-rows.repository.js';
import {
  DataTransferJob,
  DataTransferJobSchema,
  DataTransferRowError,
  DataTransferRowErrorSchema,
  DataTransferRowReceipt,
  DataTransferRowReceiptSchema,
} from './schemas/data-transfer.schemas.js';
import {
  DATA_EXPORT_QUEUE,
  DATA_IMPORT_QUEUE,
  DataTransferService,
} from './services/data-transfer.service.js';
import { StreamParserService } from './services/stream-parser.service.js';
import { PermissionsModule } from '../permissions/permissions.module.js';
import { SearchModule } from '../search/search.module.js';
import { ConsentModule } from '../consent/consent.module.js';
@Module({
  imports: [
    FilesModule,
    CrmModule,
    PermissionsModule,
    SearchModule,
    ConsentModule,
    BullModule.registerQueue({ name: DATA_IMPORT_QUEUE }, { name: DATA_EXPORT_QUEUE }),
    MongooseModule.forFeature([
      { name: DataTransferJob.name, schema: DataTransferJobSchema },
      { name: DataTransferRowReceipt.name, schema: DataTransferRowReceiptSchema },
      { name: DataTransferRowError.name, schema: DataTransferRowErrorSchema },
    ]),
  ],
  controllers: [DataTransferController],
  providers: [
    DataTransferRepository,
    DataTransferRowsRepository,
    StreamParserService,
    DataTransferService,
    DataImportProcessor,
    DataExportProcessor,
  ],
  exports: [DataTransferService],
})
export class DataTransferModule {}
