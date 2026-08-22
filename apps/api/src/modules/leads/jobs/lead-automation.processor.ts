import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { CrmEventService } from '../../crm/crm-event.service.js';
import { LeadsRepository } from '../repositories/leads.repository.js';
import { LEAD_AUTOMATION_QUEUE } from '../services/external-lead-ingestion.service.js';
import { LeadQualificationService } from '../services/lead-qualification.service.js';
import { WorkflowService } from '../../workflows/services/workflow.service.js';

interface QualificationJob {
  workspaceId: string;
  actorId: string;
  leadId: string;
  text: string;
  correlationId?: string;
  provider?: string;
  externalLeadId?: string;
  source?: string;
  qualification?: string;
  eventType?: 'lead.created'|'lead.updated';
  campaignId?:string;campaignName?:string;adSetId?:string;adSetName?:string;adId?:string;adName?:string;formId?:string;formName?:string;
}

@Injectable()
@Processor(LEAD_AUTOMATION_QUEUE, { concurrency: 5 })
export class LeadAutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(LeadAutomationProcessor.name);
  constructor(private readonly qualification: LeadQualificationService, private readonly leads: LeadsRepository, private readonly events: CrmEventService, private readonly workflows: WorkflowService,@InjectQueue(LEAD_AUTOMATION_QUEUE)private readonly queue:Queue) { super(); }

  async process(job: Job<QualificationJob>) {
    const data = job.data;
    if (job.name === 'lead.workflow') {
      try {
        return await this.workflows.triggerEvent(
          data.workspaceId,
          data.eventType??'lead.created',
          `external-lead:${data.workspaceId}:${data.provider}:${data.externalLeadId}:${data.eventType??'lead.created'}:${data.correlationId??''}`,
          { leadId: data.leadId, provider: data.provider, externalLeadId: data.externalLeadId, source: data.source,campaignId:data.campaignId,campaignName:data.campaignName,adSetId:data.adSetId,adSetName:data.adSetName,adId:data.adId,adName:data.adName,formId:data.formId,formName:data.formName },
          data.correlationId,
        );
      } catch (error: unknown) {
        this.logger.error({ workspaceId: data.workspaceId, leadId: data.leadId, error: error instanceof Error ? error.message : 'unknown' }, 'External lead workflow dispatch failed');
        throw error;
      }
    }
    if (job.name === 'lead.qualification.workflow') {
      return this.workflows.triggerEvent(
        data.workspaceId,
        data.qualification === 'disqualified' ? 'lead.disqualified' : 'lead.qualified',
        `external-lead-qualification:${data.workspaceId}:${data.leadId}:${data.qualification}`,
        { leadId:data.leadId,qualification:data.qualification,provider:data.provider,externalLeadId:data.externalLeadId,source:data.source,campaignId:data.campaignId,campaignName:data.campaignName,adSetId:data.adSetId,adSetName:data.adSetName,adId:data.adId,adName:data.adName,formId:data.formId,formName:data.formName },
        data.correlationId,
      );
    }
    if (job.name !== 'lead.qualify') return;
    const context = { workspaceId: data.workspaceId, userId: data.actorId, membershipId: '', roleIds: [] };
    try {
      const result = await this.qualification.qualify(context, { leadId: data.leadId, text: data.text });
      const lead = await this.leads.getActive(data.workspaceId, data.leadId);
      const changed = await this.leads.updateEntity(data.workspaceId, data.leadId, data.actorId, lead.version, {
        score: result.score,
        qualification: result.qualification,
        status: result.qualification === 'disqualified' ? 'disqualified' : 'open',
        aiSummaryReferenceIds: [...(lead.aiSummaryReferenceIds ?? []), result.id],
        scoreHistory: [...(lead.scoreHistory ?? []), { from: lead.score, to: result.score, changedAt: new Date(), changedBy: data.actorId }],
        qualificationAuditTrail: [...(lead.qualificationAuditTrail ?? []), { from: lead.qualification, to: result.qualification, reason: result.recommendedAction, changedAt: new Date(), changedBy: data.actorId }],
      });
      await this.events.record({ workspaceId: data.workspaceId, actorId: data.actorId, entityType: 'lead', entityId: String(changed._id), action: result.qualification === 'disqualified' ? 'disqualified' : 'qualified', ...(data.correlationId ? { correlationId: data.correlationId } : {}), metadata: { score: result.score, qualification: result.qualification, external: true } });
      await this.queue.add('lead.qualification.workflow',{...data,text:'',qualification:result.qualification},{jobId:`qualification-workflow-${data.workspaceId}-${data.leadId}-${result.qualification}`,attempts:5,backoff:{type:'exponential',delay:2_000},removeOnComplete:1_000});
      return { leadId: data.leadId, qualification: result.qualification, score: result.score };
    } catch (error: unknown) {
      this.logger.error({ workspaceId: data.workspaceId, leadId: data.leadId, error: error instanceof Error ? error.message : 'unknown' }, 'External lead qualification failed');
      if(job.attemptsMade+1>=(job.opts.attempts??1))await this.recordTerminalFailure(data,error);
      throw error;
    }
  }
  private async recordTerminalFailure(data:QualificationJob,error:unknown){try{const lead=await this.leads.getActive(data.workspaceId,data.leadId),message=error instanceof Error?error.name:'unknown';await this.leads.updateEntity(data.workspaceId,data.leadId,data.actorId,lead.version,{providerMetadata:{...(lead.providerMetadata??{}),qualificationStatus:'failed',qualificationErrorCode:message,qualificationFailedAt:new Date().toISOString()}});await this.events.record({workspaceId:data.workspaceId,actorId:data.actorId,entityType:'lead',entityId:data.leadId,action:'qualification_failed',...(data.correlationId?{correlationId:data.correlationId}:{}),metadata:{external:true,...(data.provider?{provider:data.provider}:{}),errorCode:message}})}catch(recordError:unknown){this.logger.error({workspaceId:data.workspaceId,leadId:data.leadId,error:recordError instanceof Error?recordError.message:'unknown'},'Could not record terminal lead qualification failure')}}
}
