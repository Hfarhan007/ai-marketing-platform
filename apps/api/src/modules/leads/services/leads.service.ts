import { BadRequestException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import { ContactsRepository } from '../../contacts/repositories/contacts.repository.js';
import { DealsRepository } from '../../deals/repositories/deals.repository.js';
import { CrmCrudService } from '../../crm/crud.service.js'; import { CrmEventService } from '../../crm/crm-event.service.js'; import { CrmJobsService } from '../../crm/crm-jobs.service.js'; import { mapLead } from '../../crm/crm.mappers.js';
import { ConvertLeadDto, CreateLeadDto, UpdateLeadDto } from '../dto/lead.dto.js'; import { LeadsRepository } from '../repositories/leads.repository.js'; import type { Lead } from '../schemas/lead.schema.js';
@Injectable() export class LeadsService extends CrmCrudService<Lead, CreateLeadDto, UpdateLeadDto> {
  constructor(repository: LeadsRepository, events: CrmEventService, jobs: CrmJobsService, private readonly transactions: TransactionManagerService, private readonly contacts: ContactsRepository, private readonly deals: DealsRepository) { super(repository, events, jobs, 'leads', mapLead); }
  async convert(context: WorkspaceRequestContext, id: string, dto: ConvertLeadDto) {
    const result = await this.transactions.run(async (session) => {
      const lead = await this.repository.getActive(context.workspaceId, id, session);
      if (lead.status === 'converted') throw new BadRequestException('Lead is already converted');
      const contact = await this.contacts.createEntity(context.workspaceId, context.userId, {
        displayName: lead.name, firstName: lead.name, lastName: '',
        emailAddresses: lead.email ? [{ value: lead.email, normalized: lead.email.toLowerCase(), label: 'work', primary: true }] : [],
        phoneNumbers: lead.phone ? [{ value: lead.phone, normalized: lead.phone.replace(/[^\d+]/g, ''), label: 'work', primary: true }] : [],
        source: lead.source, ownerId: lead.ownerId, lifecycleStatus: 'lead',
      }, session);
      let dealId: string | undefined;
      if (dto.pipelineId && dto.stageId) {
        const deal = await this.deals.createEntity(context.workspaceId, context.userId, { title: lead.name, value: dto.dealValue, currency: dto.currency, pipelineId: dto.pipelineId, stageId: dto.stageId, contactId: contact._id, ownerId: lead.ownerId, status: 'open' }, session);
        dealId = String(deal._id);
      }
      const changed = await this.repository.updateEntity(context.workspaceId, id, context.userId, dto.version, { status: 'converted', conversion: { contactId: String(contact._id), ...(dealId ? { dealId } : {}) } }, session);
      await this.events.record({ workspaceId: context.workspaceId, actorId: context.userId, entityType: 'lead', entityId: id, action: 'converted', session, metadata: { contactId: String(contact._id), ...(dealId ? { dealId } : {}) } });
      return changed;
    });
    return mapLead(result);
  }
}
