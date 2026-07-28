import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '../../cache/cache.module.js';
import { CustomFieldController } from './custom-field.controller.js';
import { CustomFieldRepository } from './repositories/custom-field.repository.js';
import { CUSTOM_FIELD_MIGRATION_QUEUE, CustomFieldService } from './custom-field.service.js';
import {
  CustomFieldDefinition,
  CustomFieldDefinitionSchema,
} from './schemas/custom-field.schema.js';
import { CustomFieldMigrationProcessor } from './jobs/custom-field-migration.processor.js';

@Module({
  imports: [
    CacheModule,
    BullModule.registerQueue({ name: CUSTOM_FIELD_MIGRATION_QUEUE }),
    MongooseModule.forFeature([
      { name: CustomFieldDefinition.name, schema: CustomFieldDefinitionSchema },
    ]),
  ],
  controllers: [CustomFieldController],
  providers: [CustomFieldRepository, CustomFieldService, CustomFieldMigrationProcessor],
  exports: [CustomFieldService],
})
export class CustomFieldsModule {}
