import { BadRequestException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import { CrmCrudService } from '../../crm/crud.service.js';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { CrmJobsService } from '../../crm/crm-jobs.service.js';
import { mapDeal } from '../../crm/crm.mappers.js';
import { CreateDealDto, TransitionDealDto, UpdateDealDto } from '../dto/deal.dto.js';
import { DealsRepository } from '../repositories/deals.repository.js';
import type { Deal } from '../schemas/deal.schema.js';
import { DealStateMachine, type DealState } from '../../crm/domain/crm-state-machines.js';
import { DealPolicy, type DealLineItem } from '../../crm/domain/deal-policy.js';
import { CustomFieldService } from '../../custom-fields/custom-field.service.js';
import { WorkflowService } from '../../workflows/services/workflow.service.js';
@Injectable()
export class DealsService extends CrmCrudService<Deal, CreateDealDto, UpdateDealDto> {
  private readonly states = new DealStateMachine();
  private readonly policy = new DealPolicy();
  constructor(
    repository: DealsRepository,
    events: CrmEventService,
    jobs: CrmJobsService,
    private readonly transactions: TransactionManagerService,
    private readonly fields: CustomFieldService,
    private readonly workflows: WorkflowService,
  ) {
    super(repository, events, jobs, 'deals', mapDeal);
  }
  override async create(context: WorkspaceRequestContext, dto: CreateDealDto) {
    const customFields = await this.fields.validateValues(
      context.workspaceId,
      'deals',
      dto.customFields,
    );
    try {
      this.policy.assertLineItems(
        dto.lineItems as unknown as DealLineItem[],
        dto.value,
        dto.approvalStatus === 'approved',
      );
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid deal value');
    }
    if (dto.value >= 100_000 && dto.approvalStatus !== 'approved')
      throw new BadRequestException('DEAL_APPROVAL_REQUIRED');
    const now = new Date();
    const value = await this.repository.createEntity(context.workspaceId, context.userId, {
      ...dto,
      customFields,
      status: 'open',
      probability: Math.min(dto.probability, 99),
      forecastCategory: this.policy.forecast(Math.min(dto.probability, 99)),
      stageEnteredAt: now,
      stageHistory: [],
      valueHistory: [],
      attributedRevenue: 0,
    });
    await this.record(context, value, 'created');
    await this.workflows.triggerEvent(context.workspaceId,'deal.created',`deal:${String(value._id)}:created`,{dealId:String(value._id),contactId:value.contactId?String(value.contactId):null,companyId:value.companyId?String(value.companyId):null,pipelineId:String(value.pipelineId),stageId:String(value.stageId),value:value.value,currency:value.currency,status:value.status,ownerId:value.ownerId?String(value.ownerId):null});
    return mapDeal(value);
  }
  override async update(context: WorkspaceRequestContext, id: string, dto: UpdateDealDto) {
    const customFields = await this.fields.validateValues(
      context.workspaceId,
      'deals',
      dto.customFields,
    );
    const value = await this.transactions.run(async (session) => {
      const current = await this.repository.getActive(context.workspaceId, id, session);
      const { version, ...input } = dto;
      try {
        this.policy.assertLineItems(
          dto.lineItems as unknown as DealLineItem[],
          dto.value,
          dto.approvalStatus === 'approved',
        );
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Invalid deal value',
        );
      }
      if (dto.value >= 100_000 && dto.approvalStatus !== 'approved')
        throw new BadRequestException('DEAL_APPROVAL_REQUIRED');
      const stageChanged = String(current.stageId) !== dto.stageId,
        now = new Date();
      const changed = await this.repository.updateEntity(
        context.workspaceId,
        id,
        context.userId,
        version,
        {
          ...this.prepare(input),
          customFields,
          probability: Math.min(dto.probability, 99),
          forecastCategory: this.policy.forecast(Math.min(dto.probability, 99)),
          stageEnteredAt: stageChanged ? now : (current.stageEnteredAt ?? current.createdAt),
          stageHistory: stageChanged
            ? [
                ...(current.stageHistory ?? []),
                {
                  stageId: current.stageId,
                  enteredAt: current.stageEnteredAt ?? current.createdAt,
                  exitedAt: now,
                  durationMs:
                    now.valueOf() - (current.stageEnteredAt ?? current.createdAt).valueOf(),
                },
              ]
            : (current.stageHistory ?? []),
          valueHistory:
            current.value === dto.value
              ? (current.valueHistory ?? [])
              : [
                  ...(current.valueHistory ?? []),
                  { from: current.value, to: dto.value, changedAt: now, changedBy: context.userId },
                ],
        },
        session,
      );
      await this.events.record({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        entityType: 'deal',
        entityId: id,
        action: stageChanged ? 'stage_changed' : 'updated',
        session,
        metadata: stageChanged
          ? { previousStageId: String(current.stageId), stageId: dto.stageId }
          : {},
      });
      return changed;
    });
    return mapDeal(value);
  }
  async transition(context: WorkspaceRequestContext, id: string, dto: TransitionDealDto) {
    const value = await this.transactions.run(async (session) => {
      const current = await this.repository.getActive(context.workspaceId, id, session);
      try {
        this.states.assert(current.status as DealState, dto.status, dto.allowReopen);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Invalid deal transition',
        );
      }
      if (!dto.reason.trim()) throw new BadRequestException('Deal transition reason is required');
      const update =
        dto.status === 'won'
          ? {
              status: 'won',
              probability: 100,
              forecastCategory: 'closed',
              wonReason: dto.reason,
              lostReason: null,
              closedAt: new Date(),
              attributedRevenue: current.value,
            }
          : dto.status === 'lost'
            ? {
                status: 'lost',
                probability: 0,
                forecastCategory: 'closed',
                lostReason: dto.reason,
                wonReason: null,
                closedAt: new Date(),
                attributedRevenue: 0,
              }
            : {
                status: 'open',
                probability: Math.min(current.probability, 99),
                forecastCategory: this.policy.forecast(Math.min(current.probability, 99)),
                wonReason: null,
                lostReason: null,
                closedAt: null,
                attributedRevenue: 0,
              };
      const changed = await this.repository.updateEntity(
        context.workspaceId,
        id,
        context.userId,
        dto.version,
        update,
        session,
      );
      await this.events.record({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        entityType: 'deal',
        entityId: id,
        action: dto.status,
        session,
        metadata: { previousStatus: current.status },
      });
      return changed;
    });
    return mapDeal(value);
  }
}
