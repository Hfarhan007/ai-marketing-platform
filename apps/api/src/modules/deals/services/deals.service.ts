import { BadRequestException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import { CrmCrudService } from '../../crm/crud.service.js'; import { CrmEventService } from '../../crm/crm-event.service.js'; import { CrmJobsService } from '../../crm/crm-jobs.service.js'; import { mapDeal } from '../../crm/crm.mappers.js';
import { CreateDealDto, TransitionDealDto, UpdateDealDto } from '../dto/deal.dto.js'; import { DealsRepository } from '../repositories/deals.repository.js'; import type { Deal } from '../schemas/deal.schema.js';
@Injectable() export class DealsService extends CrmCrudService<Deal, CreateDealDto, UpdateDealDto> {
  constructor(repository: DealsRepository, events: CrmEventService, jobs: CrmJobsService, private readonly transactions: TransactionManagerService) { super(repository, events, jobs, 'deals', mapDeal); }
  async transition(context: WorkspaceRequestContext, id: string, dto: TransitionDealDto) {
    const value = await this.transactions.run(async (session) => {
      const current = await this.repository.getActive(context.workspaceId, id, session);
      if (current.status !== 'open') throw new BadRequestException('Only open deals can be closed');
      const update = dto.status === 'won' ? { status: 'won', probability: 100, wonReason: dto.reason, lostReason: null } : { status: 'lost', probability: 0, lostReason: dto.reason, wonReason: null };
      const changed = await this.repository.updateEntity(context.workspaceId, id, context.userId, dto.version, update, session);
      await this.events.record({ workspaceId: context.workspaceId, actorId: context.userId, entityType: 'deal', entityId: id, action: dto.status, session, metadata: { previousStatus: current.status } });
      return changed;
    });
    return mapDeal(value);
  }
}
