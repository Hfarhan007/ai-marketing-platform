import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsentModule } from '../consent/consent.module.js';
import { AiMemoryRecord, AiMemoryRecordSchema } from './ai-memory.schema.js';
import { AiMemoryService } from './ai-memory.service.js';
import { AiMemoryRepository } from './repositories/ai-memory.repository.js';

@Module({
  imports: [
    ConsentModule,
    MongooseModule.forFeature([{ name: AiMemoryRecord.name, schema: AiMemoryRecordSchema }]),
  ],
  providers: [AiMemoryRepository, AiMemoryService],
  exports: [AiMemoryService],
})
export class AgentsModule {}
