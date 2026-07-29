export const SAGA_TYPES = [
  'workspace_provisioning',
  'lead_conversion',
  'campaign_launch',
  'appointment_external_calendar',
  'integration_connection',
  'subscription_activation',
  'workspace_deletion',
  'privacy_deletion_request',
  'knowledge_source_ingestion',
] as const;
export type SagaType = (typeof SAGA_TYPES)[number];

export const SAGA_STATUSES = [
  'pending',
  'running',
  'waiting_external',
  'waiting_retry',
  'compensating',
  'completed',
  'cancelled',
  'manual_intervention',
] as const;
export type SagaStatus = (typeof SAGA_STATUSES)[number];

export interface SagaStepDefinition {
  name: string;
  command: string;
  maxAttempts: number;
  timeoutMs: number;
  compensation?: { name: string; command: string };
  irreversible?: boolean;
}

export interface SagaDefinition {
  type: SagaType;
  timeoutMs: number;
  steps: readonly SagaStepDefinition[];
}

export interface SagaJob {
  sagaId: string;
  workspaceId: string;
}

export interface SagaStepResult {
  outcome: 'completed' | 'waiting';
  externalReference?: string;
}
