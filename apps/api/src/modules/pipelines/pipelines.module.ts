import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmModule } from '../crm/crm.module.js';
import { PipelinesController } from './controllers/pipelines.controller.js';
import { PipelinesRepository } from './repositories/pipelines.repository.js';
import { Pipeline, PipelineSchema } from './schemas/pipeline.schema.js';
import { PipelinesService } from './services/pipelines.service.js';
@Module({ imports: [MongooseModule.forFeature([{ name: Pipeline.name, schema: PipelineSchema }]), CrmModule], controllers: [PipelinesController], providers: [PipelinesRepository, PipelinesService], exports: [PipelinesRepository] })
export class PipelinesModule {}
