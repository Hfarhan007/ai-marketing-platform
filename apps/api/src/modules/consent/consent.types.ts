export const CONSENT_PURPOSES = [
  'transactional_email',
  'marketing_email',
  'sms_marketing',
  'whatsapp_marketing',
  'call_consent',
  'profiling',
  'ai_processing',
  'ai_memory',
  'analytics',
  'third_party_sharing',
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];
export type ConsentDecision = 'granted' | 'denied';

export interface ConsentEvaluationRequest {
  workspaceId: string;
  subjectId: string;
  purpose: ConsentPurpose;
  region?: string;
  at?: Date;
}

export interface ConsentEvaluation {
  allowed: boolean;
  purpose: ConsentPurpose;
  reason:
    | 'consent_granted'
    | 'legal_basis'
    | 'withdrawn'
    | 'denied'
    | 'guardian_required'
    | 'no_policy'
    | 'no_valid_basis';
  policyVersionId?: string;
  receiptId?: string;
  legalBasisId?: string;
  evaluatedAt: Date;
}

export const purposeForCommunication = (
  channel: 'email' | 'sms' | 'whatsapp',
  communicationType: 'transactional' | 'marketing',
): ConsentPurpose => {
  if (channel === 'email')
    return communicationType === 'transactional' ? 'transactional_email' : 'marketing_email';
  if (communicationType === 'transactional')
    throw new Error(`${channel} communications require an explicit marketing purpose`);
  return channel === 'sms' ? 'sms_marketing' : 'whatsapp_marketing';
};
