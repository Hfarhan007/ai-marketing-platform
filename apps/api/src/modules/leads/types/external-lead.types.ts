export interface NormalizedExternalLead {
  workspaceId: string;
  actorId: string;
  provider: string;
  externalLeadId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  campaignId?: string;
  campaignName?: string;
  adSetId?: string;
  adSetName?: string;
  adId?: string;
  adName?: string;
  formId?: string;
  formName?: string;
  fields?: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
  receivedAt: Date;
  correlationId?: string;
}

export interface ExternalLeadIngestionResult {
  leadId: string;
  created: boolean;
  duplicate: boolean;
  qualificationQueued: boolean;
}
