import { BadRequestException, Injectable } from '@nestjs/common';
import { CrmCrudService } from '../../crm/crud.service.js'; import { CrmEventService } from '../../crm/crm-event.service.js'; import { CrmJobsService } from '../../crm/crm-jobs.service.js'; import { mapPipeline } from '../../crm/crm.mappers.js';
import { CreatePipelineDto, UpdatePipelineDto } from '../dto/pipeline.dto.js'; import { PipelinesRepository } from '../repositories/pipelines.repository.js'; import type { Pipeline } from '../schemas/pipeline.schema.js';
@Injectable() export class PipelinesService extends CrmCrudService<Pipeline, CreatePipelineDto, UpdatePipelineDto> {
  constructor(repository: PipelinesRepository, events: CrmEventService, jobs: CrmJobsService) { super(repository, events, jobs, 'pipelines', mapPipeline); }
  protected override prepare(dto: CreatePipelineDto) {
    const orders = dto.stages.map((stage) => stage.order);
    if (new Set(orders).size !== orders.length) throw new BadRequestException('Pipeline stage order must be unique');
    return { ...dto, stages: [...dto.stages].sort((a, b) => a.order - b.order) };
  }
}
