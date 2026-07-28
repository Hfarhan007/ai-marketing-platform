import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrmRepository } from '../../crm/crm.repository.js';
import { Pipeline, type PipelineDocument } from '../schemas/pipeline.schema.js';
@Injectable()
export class PipelinesRepository extends CrmRepository<Pipeline> {
  constructor(@InjectModel(Pipeline.name) model: Model<PipelineDocument>) {
    super(model, new Set(['createdAt', 'updatedAt', 'name', 'status']));
  }
}
