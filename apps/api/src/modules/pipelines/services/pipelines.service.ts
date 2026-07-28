import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import { DealsRepository } from '../../deals/repositories/deals.repository.js';
import { CrmCrudService } from '../../crm/crud.service.js';
import { PipelinePolicy } from '../../crm/domain/pipeline-policy.js';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { CrmJobsService } from '../../crm/crm-jobs.service.js';
import { mapPipeline } from '../../crm/crm.mappers.js';
import { CreatePipelineDto, UpdatePipelineDto } from '../dto/pipeline.dto.js';
import { PipelinesRepository } from '../repositories/pipelines.repository.js';
import type { Pipeline } from '../schemas/pipeline.schema.js';
@Injectable()
export class PipelinesService extends CrmCrudService<
  Pipeline,
  CreatePipelineDto,
  UpdatePipelineDto
> {
  private readonly policy = new PipelinePolicy();
  constructor(
    repository: PipelinesRepository,
    events: CrmEventService,
    jobs: CrmJobsService,
    private readonly transactions: TransactionManagerService,
    private readonly deals: DealsRepository,
  ) {
    super(repository, events, jobs, 'pipelines', mapPipeline);
  }
  override async update(context: WorkspaceRequestContext, id: string, dto: UpdatePipelineDto) {
    const value = await this.transactions.run(async (session) => {
      const current = await this.repository.getActive(context.workspaceId, id, session);
      const stages = dto.stages.map((stage) => {
        const existing = stage.id
          ? current.stages.find((value) => String(value._id) === stage.id)
          : current.stages.find((value) => value.name === stage.name);
        return { ...stage, _id: existing?._id ?? new Types.ObjectId() };
      });
      const currentDefinitions = current.stages.map((stage) => ({
        id: String(stage._id),
        name: stage.name,
        order: stage.order,
        probability: stage.probability,
        rules: stage.rules,
      }));
      const nextDefinitions = stages.map((stage) => ({
        id: String(stage._id),
        name: stage.name,
        order: stage.order,
        probability: stage.probability,
        rules: stage.rules,
      }));
      const used = await this.deals.usedStageIds(context.workspaceId, id, session);
      try {
        this.policy.validate(nextDefinitions);
        this.policy.assertSafeChange(
          currentDefinitions,
          nextDefinitions,
          used,
          new Map(Object.entries(dto.stageMigrations)),
        );
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Invalid pipeline stages',
        );
      }
      await this.deals.migrateStages(context.workspaceId, id, dto.stageMigrations, session);
      const changed = await this.repository.updateEntity(
        context.workspaceId,
        id,
        context.userId,
        dto.version,
        { name: dto.name, status: dto.status, isDefault: dto.isDefault, stages },
        session,
      );
      await this.events.record({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        entityType: 'pipeline',
        entityId: id,
        action: 'stages_updated',
        session,
        metadata: { migrationCount: Object.keys(dto.stageMigrations).length },
      });
      return changed;
    });
    return mapPipeline(value);
  }
  protected override prepare(dto: CreatePipelineDto) {
    try {
      this.policy.validate(dto.stages);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid pipeline stages',
      );
    }
    return { ...dto, stages: [...dto.stages].sort((a, b) => a.order - b.order) };
  }
}
