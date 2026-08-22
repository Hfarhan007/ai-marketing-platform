import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { TransactionManagerService } from '../../../database/transactions/transaction-manager.service.js';
import { ContactsRepository } from '../../contacts/repositories/contacts.repository.js';
import { DealsRepository } from '../../deals/repositories/deals.repository.js';
import { CrmCrudService } from '../../crm/crud.service.js';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { CrmJobsService } from '../../crm/crm-jobs.service.js';
import { mapLead } from '../../crm/crm.mappers.js';
import { ConvertLeadDto, CreateLeadDto, UpdateLeadDto } from '../dto/lead.dto.js';
import { LeadsRepository } from '../repositories/leads.repository.js';
import type { Lead } from '../schemas/lead.schema.js';
import {
  LeadQualificationMachine,
  type LeadQualification,
} from '../../crm/domain/crm-state-machines.js';
import { CustomFieldService } from '../../custom-fields/custom-field.service.js';
import { WorkflowService } from '../../workflows/services/workflow.service.js';
@Injectable()
export class LeadsService extends CrmCrudService<Lead, CreateLeadDto, UpdateLeadDto> {
  private readonly qualificationMachine = new LeadQualificationMachine();
  constructor(
    repository: LeadsRepository,
    events: CrmEventService,
    jobs: CrmJobsService,
    private readonly transactions: TransactionManagerService,
    private readonly contacts: ContactsRepository,
    private readonly deals: DealsRepository,
    private readonly fields: CustomFieldService,
    private readonly workflows: WorkflowService,
  ) {
    super(repository, events, jobs, 'leads', mapLead);
  }
  override async create(context: WorkspaceRequestContext, dto: CreateLeadDto) {
    const customFields = await this.fields.validateValues(
      context.workspaceId,
      'leads',
      dto.customFields,
    );
    const lead=await super.create(context, { ...dto, customFields });
    const leadId=String((lead as{id?:unknown}).id??'');
    if(leadId)await this.workflows.triggerEvent(context.workspaceId,'lead.created',`lead:${leadId}:created`,{leadId,source:dto.source,campaignId:dto.campaignId??null,score:dto.score,qualification:dto.qualification,external:false});
    return lead;
  }
  protected override prepare(dto: CreateLeadDto) {
    return {
      ...dto,
      normalizedEmail: dto.email.trim().toLowerCase(),
      normalizedPhone: dto.phone.replace(/[^\d+]/gu, ''),
    };
  }
  override async update(context: WorkspaceRequestContext, id: string, dto: UpdateLeadDto) {
    const current = await this.repository.getActive(context.workspaceId, id);
    try {
      this.qualificationMachine.assert(
        current.qualification as LeadQualification,
        dto.qualification as LeadQualification,
        dto.disqualificationReason,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid lead transition',
      );
    }
    if (current.status === 'converted')
      throw new BadRequestException('Converted leads are immutable');
    const { version, ...input } = dto;
    const customFields = await this.fields.validateValues(
      context.workspaceId,
      'leads',
      dto.customFields,
    );
    const changed = await this.repository.updateEntity(
      context.workspaceId,
      id,
      context.userId,
      version,
      {
        ...this.prepare(input),
        customFields,
        scoreHistory:
          current.score === dto.score
            ? current.scoreHistory
            : [
                ...(current.scoreHistory ?? []),
                {
                  from: current.score,
                  to: dto.score,
                  changedAt: new Date(),
                  changedBy: context.userId,
                },
              ],
        qualificationAuditTrail:
          current.qualification === dto.qualification
            ? current.qualificationAuditTrail
            : [
                ...(current.qualificationAuditTrail ?? []),
                {
                  from: current.qualification,
                  to: dto.qualification,
                  reason: dto.disqualificationReason,
                  changedAt: new Date(),
                  changedBy: context.userId,
                },
              ],
        status:
          dto.qualification === 'disqualified'
            ? 'disqualified'
            : current.status === 'disqualified'
              ? 'open'
              : dto.status,
      },
    );
    await this.events.record({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      entityType: 'lead',
      entityId: id,
      action: current.qualification === dto.qualification ? 'updated' : 'qualification_changed',
      metadata: { from: current.qualification, to: dto.qualification },
    });
    const trigger=current.qualification===dto.qualification?'lead.updated':dto.qualification==='disqualified'?'lead.disqualified':'lead.qualified';
    await this.workflows.triggerEvent(context.workspaceId,trigger,`lead:${id}:version:${changed.version}`,{leadId:id,source:changed.source,campaignId:changed.campaignId?String(changed.campaignId):null,score:changed.score,qualification:changed.qualification,status:changed.status,externalProvider:changed.externalProvider,externalLeadId:changed.externalLeadId});
    return mapLead(changed);
  }
  async convert(context: WorkspaceRequestContext, id: string, dto: ConvertLeadDto) {
    const result = await this.transactions.run(async (session) => {
      const lead = await this.repository.getActive(context.workspaceId, id, session);
      if (lead.status === 'converted') throw new BadRequestException('Lead is already converted');
      try {
        this.qualificationMachine.assertConvertible(lead.qualification as LeadQualification);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Lead is not eligible',
        );
      }
      const normalizedEmail = lead.email.trim().toLowerCase(),
        normalizedPhone = lead.phone.replace(/[^\d+]/gu, '');
      if (
        await this.contacts.findIdentity(
          context.workspaceId,
          normalizedEmail,
          normalizedPhone,
          session,
        )
      )
        throw new ConflictException('Lead identity already belongs to a contact');
      const contact = await this.contacts.createEntity(
        context.workspaceId,
        context.userId,
        {
          displayName: lead.name,
          firstName: lead.name,
          lastName: '',
          emailAddresses: lead.email
            ? [
                {
                  value: lead.email,
                  normalized: lead.email.toLowerCase(),
                  label: 'work',
                  primary: true,
                },
              ]
            : [],
          phoneNumbers: lead.phone
            ? [
                {
                  value: lead.phone,
                  normalized: lead.phone.replace(/[^\d+]/g, ''),
                  label: 'work',
                  primary: true,
                },
              ]
            : [],
          source: lead.source,
          ownerId: lead.ownerId,
          lifecycleStatus: 'lead',
        },
        session,
      );
      let dealId: string | undefined;
      if (dto.pipelineId && dto.stageId) {
        const deal = await this.deals.createEntity(
          context.workspaceId,
          context.userId,
          {
            title: lead.name,
            value: dto.dealValue,
            currency: dto.currency,
            pipelineId: dto.pipelineId,
            stageId: dto.stageId,
            contactId: contact._id,
            ownerId: lead.ownerId,
            status: 'open',
          },
          session,
        );
        dealId = String(deal._id);
      }
      const changed = await this.repository.updateEntity(
        context.workspaceId,
        id,
        context.userId,
        dto.version,
        {
          status: 'converted',
          conversion: { contactId: String(contact._id), ...(dealId ? { dealId } : {}) },
        },
        session,
      );
      await this.events.record({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        entityType: 'lead',
        entityId: id,
        action: 'converted',
        session,
        metadata: { contactId: String(contact._id), ...(dealId ? { dealId } : {}) },
      });
      return changed;
    });
    await this.workflows.triggerEvent(context.workspaceId,'lead.converted',`lead:${id}:converted`,{leadId:id,source:result.source,campaignId:result.campaignId?String(result.campaignId):null,score:result.score,qualification:result.qualification,contactId:result.conversion?.contactId,dealId:result.conversion?.dealId,externalProvider:result.externalProvider,externalLeadId:result.externalLeadId});
    return mapLead(result);
  }
}
