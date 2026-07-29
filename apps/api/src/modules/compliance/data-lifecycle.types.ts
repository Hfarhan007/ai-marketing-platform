export const DATA_CLASSES = [
  'users',
  'workspaces',
  'contacts',
  'messages',
  'campaign_deliveries',
  'audit_logs',
  'ai_prompts_outputs',
  'knowledge_documents',
  'files',
  'webhook_logs',
  'job_histories',
  'exports',
  'authentication_records',
] as const;
export type DataClass = (typeof DATA_CLASSES)[number];

export const LIFECYCLE_STATES = [
  'active',
  'soft_deleted',
  'archived',
  'expired',
  'legal_hold',
  'scheduled_deletion',
  'anonymized',
  'hard_deleted',
] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];
export type DeletionMode = 'anonymize' | 'hard_delete';
export type ManifestStage = 'object_storage' | 'vector_index' | 'cache' | 'mongodb';
export type StageStatus = 'pending' | 'completed' | 'failed' | 'not_applicable';

export interface HoldEvaluation {
  dataClass: DataClass;
  recordId: string | null;
  releasedAt: Date | null;
}

export function hasApplicableLegalHold(
  holds: readonly HoldEvaluation[],
  dataClass: DataClass,
  recordId: string,
) {
  return holds.some(
    (hold) =>
      hold.dataClass === dataClass &&
      hold.releasedAt === null &&
      (hold.recordId === null || hold.recordId === recordId),
  );
}

export function retryableStages(stages: Record<ManifestStage, StageStatus>): ManifestStage[] {
  return (['object_storage', 'vector_index', 'cache', 'mongodb'] as const).filter(
    (stage) => stages[stage] === 'pending' || stages[stage] === 'failed',
  );
}

export function deletionProgressStatus(
  entries: readonly { stages: Record<ManifestStage, StageStatus> }[],
) {
  const values = entries.flatMap((entry) => Object.values(entry.stages));
  if (values.some((value) => value === 'failed')) return 'partial_failure' as const;
  if (values.every((value) => value === 'completed' || value === 'not_applicable'))
    return 'completed' as const;
  return 'running' as const;
}

export interface LifecycleJob {
  manifestId?: string;
  workspaceId: string;
  dryRun: boolean;
  requestedBy: string;
}

export const PLATFORM_POLICY_LIMITS: Record<
  DataClass,
  { defaultDays: number; minDays: number; maxDays: number; mode: DeletionMode; recoveryDays: number }
> = {
  users: { defaultDays: 2_555, minDays: 30, maxDays: 3_650, mode: 'anonymize', recoveryDays: 30 },
  workspaces: { defaultDays: 30, minDays: 7, maxDays: 90, mode: 'hard_delete', recoveryDays: 30 },
  contacts: { defaultDays: 1_095, minDays: 30, maxDays: 3_650, mode: 'anonymize', recoveryDays: 30 },
  messages: { defaultDays: 730, minDays: 30, maxDays: 2_555, mode: 'hard_delete', recoveryDays: 30 },
  campaign_deliveries: {
    defaultDays: 365,
    minDays: 30,
    maxDays: 2_555,
    mode: 'anonymize',
    recoveryDays: 0,
  },
  audit_logs: { defaultDays: 2_555, minDays: 365, maxDays: 3_650, mode: 'hard_delete', recoveryDays: 0 },
  ai_prompts_outputs: {
    defaultDays: 90,
    minDays: 1,
    maxDays: 365,
    mode: 'hard_delete',
    recoveryDays: 7,
  },
  knowledge_documents: {
    defaultDays: 365,
    minDays: 7,
    maxDays: 2_555,
    mode: 'hard_delete',
    recoveryDays: 30,
  },
  files: { defaultDays: 365, minDays: 7, maxDays: 2_555, mode: 'hard_delete', recoveryDays: 30 },
  webhook_logs: { defaultDays: 90, minDays: 7, maxDays: 365, mode: 'hard_delete', recoveryDays: 0 },
  job_histories: { defaultDays: 30, minDays: 7, maxDays: 180, mode: 'hard_delete', recoveryDays: 0 },
  exports: { defaultDays: 7, minDays: 1, maxDays: 30, mode: 'hard_delete', recoveryDays: 0 },
  authentication_records: {
    defaultDays: 90,
    minDays: 30,
    maxDays: 365,
    mode: 'hard_delete',
    recoveryDays: 0,
  },
};

export const DATA_COLLECTIONS: Record<DataClass, readonly string[]> = {
  users: ['users'],
  workspaces: ['workspaces'],
  contacts: ['contacts'],
  messages: ['messages'],
  campaign_deliveries: ['campaign_deliveries'],
  audit_logs: [
    'audit_events',
    'auth_audit_events',
    'crm_audit_events',
    'privileged_access_audit',
    'consent_audit_events',
  ],
  ai_prompts_outputs: ['ai_memory_records', 'ai_usage_records'],
  knowledge_documents: ['knowledge_sources', 'knowledge_chunks', 'knowledge_embeddings'],
  files: ['files'],
  webhook_logs: ['integration_webhook_events', 'integration_webhook_deliveries'],
  job_histories: ['workflow_runs', 'integration_sync_jobs', 'event_processing_failures'],
  exports: ['data_transfer_jobs', 'data_transfer_row_receipts', 'data_transfer_row_errors'],
  authentication_records: [
    'auth_sessions',
    'auth_tokens',
    'refresh_tokens',
    'login_attempts',
    'two_factor_recovery_codes',
  ],
};
