import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../../events/events.module.js';
import { KnowledgeSourceController } from './controllers/knowledge-source.controller.js';
import { KnowledgeSourceRepository } from './repositories/knowledge-source.repository.js';
import { KnowledgeSource, KnowledgeSourceSchema } from './schemas/knowledge-source.schema.js';
import { KnowledgeSourceService } from './services/knowledge-source.service.js';
@Module({
  imports: [
    EventsModule,
    MongooseModule.forFeature([{ name: KnowledgeSource.name, schema: KnowledgeSourceSchema }]),
  ],
  controllers: [KnowledgeSourceController],
  providers: [KnowledgeSourceRepository, KnowledgeSourceService],
  exports: [KnowledgeSourceService],
})
export class KnowledgeBaseModule {}
