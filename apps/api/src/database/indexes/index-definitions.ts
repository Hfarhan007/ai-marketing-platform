import type { mongo } from 'mongoose';
import { MIGRATION_COLLECTION, SEED_STATE_COLLECTION } from '../mongo/mongo.constants.js';

export interface ExplicitIndexDefinition {
  collection: string;
  name: string;
  keys: mongo.IndexSpecification;
  options?: Omit<mongo.CreateIndexesOptions, 'name'>;
}

export const INDEX_DEFINITIONS: readonly ExplicitIndexDefinition[] = [
  {
    collection: 'custom_field_definitions',
    name: 'workspace_entity_key_unique',
    keys: { workspaceId: 1, entityType: 1, key: 1 },
    options: { unique: true },
  },
  {
    collection: 'custom_field_definitions',
    name: 'workspace_entity_archived_group',
    keys: { workspaceId: 1, entityType: 1, archived: 1, group: 1 },
  },
  {
    collection: MIGRATION_COLLECTION,
    name: 'migration_id_unique',
    keys: { migrationId: 1 },
    options: { unique: true },
  },
  {
    collection: MIGRATION_COLLECTION,
    name: 'migration_repeatable_checksum',
    keys: { repeatable: 1, checksum: 1 },
  },
  {
    collection: SEED_STATE_COLLECTION,
    name: 'seed_id_unique',
    keys: { seedId: 1 },
    options: { unique: true },
  },
  {
    collection: 'workspaces',
    name: 'workspace_slug_unique',
    keys: { slug: 1 },
    options: { unique: true },
  },
  {
    collection: 'workspaces',
    name: 'workspace_owner_status',
    keys: { ownerId: 1, status: 1 },
  },
  workspaceIndex('memberships', { userId: 1 }, 'membership_workspace_user_unique', {
    unique: true,
  }),
  {
    collection: 'users',
    name: 'user_email_unique',
    keys: { email: 1 },
    options: { unique: true },
  },
  {
    collection: 'auth_sessions',
    name: 'auth_session_user_active',
    keys: { userId: 1, revokedAt: 1, expiresAt: -1 },
  },
  {
    collection: 'auth_sessions',
    name: 'auth_session_expiry',
    keys: { expiresAt: 1 },
    options: { expireAfterSeconds: 0 },
  },
  {
    collection: 'refresh_tokens',
    name: 'refresh_token_hash_unique',
    keys: { tokenHash: 1 },
    options: { unique: true },
  },
  {
    collection: 'refresh_tokens',
    name: 'refresh_token_family',
    keys: { familyId: 1, revokedAt: 1 },
  },
  {
    collection: 'refresh_tokens',
    name: 'refresh_token_expiry',
    keys: { expiresAt: 1 },
    options: { expireAfterSeconds: 0 },
  },
  {
    collection: 'email_verification_tokens',
    name: 'verification_token_hash_unique',
    keys: { tokenHash: 1 },
    options: { unique: true },
  },
  {
    collection: 'email_verification_tokens',
    name: 'verification_token_expiry',
    keys: { expiresAt: 1 },
    options: { expireAfterSeconds: 0 },
  },
  {
    collection: 'password_reset_tokens',
    name: 'password_reset_hash_unique',
    keys: { tokenHash: 1 },
    options: { unique: true },
  },
  {
    collection: 'password_reset_tokens',
    name: 'password_reset_expiry',
    keys: { expiresAt: 1 },
    options: { expireAfterSeconds: 0 },
  },
  {
    collection: 'two_factor_recovery_codes',
    name: 'recovery_code_user_hash_unique',
    keys: { userId: 1, codeHash: 1 },
    options: { unique: true },
  },
  {
    collection: 'login_attempts',
    name: 'login_attempt_email_time',
    keys: { emailHash: 1, createdAt: -1 },
  },
  {
    collection: 'login_attempts',
    name: 'login_attempt_expiry',
    keys: { createdAt: 1 },
    options: { expireAfterSeconds: 2_592_000 },
  },
  {
    collection: 'auth_audit_events',
    name: 'auth_audit_user_time',
    keys: { userId: 1, createdAt: -1 },
  },
  {
    collection: 'roles',
    name: 'system_role_key_unique',
    keys: { scope: 1, key: 1 },
    options: { unique: true, partialFilterExpression: { scope: 'system' } },
  },
  workspaceIndex('roles', { key: 1 }, 'workspace_role_key_unique', {
    unique: true,
    partialFilterExpression: { scope: 'workspace' },
  }),
  workspaceIndex('roles', { status: 1 }, 'workspace_role_status'),
  workspaceIndex(
    'privileged_access_audit',
    { userId: 1, createdAt: -1 },
    'privileged_audit_workspace_user_time',
  ),
  workspaceIndex('memberships', { status: 1, userId: 1 }, 'membership_workspace_status_user'),
  workspaceIndex('workspace_settings', {}, 'workspace_settings_workspace_unique', { unique: true }),
  workspaceIndex('contacts', { 'emailAddresses.normalized': 1 }, 'contacts_workspace_email', {
    unique: true,
    partialFilterExpression: { 'emailAddresses.normalized': { $type: 'string' }, deletedAt: null },
  }),
  workspaceIndex('contacts', { 'phoneNumbers.normalized': 1 }, 'contacts_workspace_phone', {
    unique: true,
    partialFilterExpression: { 'phoneNumbers.normalized': { $type: 'string' }, deletedAt: null },
  }),
  workspaceIndex('contacts', { ownerId: 1, createdAt: -1 }, 'contacts_workspace_owner_created'),
  workspaceIndex(
    'contacts',
    { displayName: 'text', 'emailAddresses.value': 'text', tags: 'text' },
    'contacts_workspace_text',
  ),
  workspaceIndex('companies', { domain: 1 }, 'companies_workspace_domain', {
    unique: true,
    partialFilterExpression: { domain: { $type: 'string', $gt: '' }, deletedAt: null },
  }),
  workspaceIndex('companies', { ownerId: 1, createdAt: -1 }, 'companies_workspace_owner_created'),
  workspaceIndex('companies', { parentCompanyId: 1 }, 'companies_workspace_parent'),
  workspaceIndex(
    'companies',
    { name: 'text', domain: 'text', industry: 'text', tags: 'text' },
    'companies_workspace_text',
  ),
  workspaceIndex('leads', { status: 1, createdAt: -1 }, 'leads_workspace_status_created'),
  workspaceIndex('leads', { ownerId: 1, followUpAt: 1 }, 'leads_workspace_owner_follow_up'),
  workspaceIndex('leads', { name: 'text', email: 'text', phone: 'text' }, 'leads_workspace_text'),
  workspaceIndex('leads', { normalizedEmail: 1, status: 1 }, 'leads_workspace_normalized_email'),
  workspaceIndex('leads', { normalizedPhone: 1, status: 1 }, 'leads_workspace_normalized_phone'),
  workspaceIndex(
    'deals',
    { pipelineId: 1, stageId: 1, status: 1 },
    'deals_workspace_pipeline_stage',
  ),
  workspaceIndex('deals', { ownerId: 1, expectedCloseDate: 1 }, 'deals_workspace_owner_close'),
  workspaceIndex('deals', { title: 'text' }, 'deals_workspace_text'),
  workspaceIndex('pipelines', { isDefault: 1 }, 'pipelines_workspace_default', {
    unique: true,
    partialFilterExpression: { isDefault: true, deletedAt: null },
  }),
  workspaceIndex('pipelines', { status: 1, createdAt: -1 }, 'pipelines_workspace_status_created'),
  workspaceIndex('crm_audit_events', { createdAt: -1 }, 'crm_audit_workspace_created'),
  workspaceIndex(
    'crm_domain_events',
    { publishedAt: 1, createdAt: 1 },
    'crm_events_workspace_outbox',
  ),
  workspaceIndex('tasks', { ownerId: 1, status: 1, dueAt: 1 }, 'tasks_workspace_owner_status_due'),
  workspaceIndex('tasks', { parentTaskId: 1 }, 'tasks_workspace_parent'),
  workspaceIndex(
    'appointments',
    { staffId: 1, startAt: 1, endAt: 1, status: 1 },
    'appointments_workspace_staff_range',
  ),
  workspaceIndex(
    'appointments',
    { customerId: 1, startAt: -1 },
    'appointments_workspace_customer_start',
  ),
  workspaceIndex('appointments', { idempotencyKey: 1 }, 'appointments_workspace_idempotency', {
    unique: true,
  }),
  workspaceIndex('booking_services', { active: 1, name: 1 }, 'services_workspace_active_name'),
  workspaceIndex('availability_rules', { staffId: 1 }, 'availability_workspace_staff', {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  }),
  {
    collection: 'booking_links',
    name: 'booking_links_public_slug',
    keys: { slug: 1 },
    options: { unique: true },
  },
  workspaceIndex('booking_links', { active: 1 }, 'booking_links_workspace_active'),
  workspaceIndex(
    'conversations',
    { status: 1, lastMessageAt: -1 },
    'conversations_workspace_status_last',
  ),
  workspaceIndex(
    'conversations',
    { assigneeIds: 1, lastMessageAt: -1 },
    'conversations_workspace_assignee_last',
  ),
  workspaceIndex(
    'conversations',
    { subject: 'text', lastMessagePreview: 'text' },
    'conversations_workspace_text',
  ),
  workspaceIndex(
    'messages',
    { conversationId: 1, createdAt: -1, _id: -1 },
    'messages_workspace_conversation_cursor',
  ),
  workspaceIndex('messages', { providerMessageId: 1 }, 'messages_workspace_provider_unique', {
    unique: true,
    partialFilterExpression: { providerMessageId: { $type: 'string' } },
  }),
  workspaceIndex('messages', { idempotencyKey: 1 }, 'messages_workspace_idempotency', {
    unique: true,
  }),
  workspaceIndex('participants', { contactId: 1 }, 'participants_workspace_contact'),
  workspaceIndex('channel_connections', { type: 1, status: 1 }, 'channels_workspace_type_status'),
  workspaceIndex('message_templates', { name: 1 }, 'templates_workspace_name', { unique: true }),
  workspaceIndex(
    'conversation_assignments',
    { conversationId: 1, userId: 1 },
    'assignments_workspace_conversation_user',
    { unique: true, partialFilterExpression: { unassignedAt: null } },
  ),
  workspaceIndex('conversation_labels', { name: 1 }, 'labels_workspace_name', { unique: true }),
  workspaceIndex(
    'workflow_definitions',
    { status: 1, updatedAt: -1 },
    'workflow_definitions_workspace_status',
  ),
  workspaceIndex(
    'workflow_versions',
    { workflowDefinitionId: 1, version: 1 },
    'workflow_versions_workspace_definition_version',
    { unique: true },
  ),
  workspaceIndex('workflow_runs', { idempotencyKey: 1 }, 'workflow_runs_workspace_idempotency', {
    unique: true,
  }),
  workspaceIndex(
    'workflow_runs',
    { status: 1, createdAt: -1 },
    'workflow_runs_workspace_status_created',
  ),
  workspaceIndex(
    'workflow_step_runs',
    { workflowRunId: 1, createdAt: 1 },
    'workflow_steps_workspace_run_created',
  ),
  workspaceIndex(
    'workflow_wait_states',
    { status: 1, resumeAt: 1 },
    'workflow_waits_workspace_resume',
  ),
  workspaceIndex('workflow_deduplication_keys', { key: 1 }, 'workflow_dedupe_workspace_key', {
    unique: true,
  }),
  {
    collection: 'workflow_deduplication_keys',
    name: 'workflow_dedupe_expiry',
    keys: { expiresAt: 1 },
    options: { expireAfterSeconds: 0 },
  },
  workspaceIndex('campaigns', { status: 1, scheduledAt: 1 }, 'campaigns_workspace_status_schedule'),
  workspaceIndex(
    'campaign_versions',
    { campaignId: 1, version: 1 },
    'campaign_versions_workspace_campaign_version',
    { unique: true },
  ),
  workspaceIndex('audiences', { name: 1 }, 'audiences_workspace_name', { unique: true }),
  workspaceIndex('segments', { name: 1 }, 'segments_workspace_name', { unique: true }),
  workspaceIndex('campaign_runs', { idempotencyKey: 1 }, 'campaign_runs_workspace_idempotency', {
    unique: true,
  }),
  workspaceIndex(
    'campaign_runs',
    { campaignId: 1, createdAt: -1 },
    'campaign_runs_workspace_campaign_created',
  ),
  workspaceIndex('campaign_deliveries', { idempotencyKey: 1 }, 'deliveries_workspace_idempotency', {
    unique: true,
  }),
  workspaceIndex(
    'campaign_deliveries',
    { campaignRunId: 1, status: 1, deliverAt: 1 },
    'deliveries_workspace_run_status_time',
  ),
  workspaceIndex(
    'suppression_entries',
    { channel: 1, normalizedAddress: 1 },
    'suppressions_workspace_channel_address',
    { unique: true },
  ),
  workspaceIndex(
    'unsubscribe_events',
    { normalizedAddress: 1, createdAt: -1 },
    'unsubscribe_workspace_address_created',
  ),
  workspaceIndex(
    'campaign_metrics',
    { campaignRunId: 1, eventType: 1, conversionEventId: 1 },
    'campaign_metrics_workspace_run_event',
    { unique: true },
  ),
  workspaceIndex(
    'integration_connections',
    { provider: 1, status: 1 },
    'integrations_workspace_provider_status',
  ),
  workspaceIndex(
    'integration_credentials',
    { connectionId: 1 },
    'credentials_workspace_connection',
    { unique: true },
  ),
  workspaceIndex(
    'integration_webhook_events',
    { connectionId: 1, providerEventId: 1 },
    'webhooks_workspace_connection_event',
    { unique: true },
  ),
  workspaceIndex(
    'integration_webhook_events',
    { status: 1, createdAt: 1 },
    'webhooks_workspace_status_created',
  ),
  workspaceIndex(
    'integration_webhook_deliveries',
    { webhookEventId: 1, attempt: 1 },
    'webhook_deliveries_workspace_event_attempt',
    { unique: true },
  ),
  workspaceIndex(
    'integration_sync_jobs',
    { idempotencyKey: 1 },
    'sync_jobs_workspace_idempotency',
    { unique: true },
  ),
  workspaceIndex(
    'integration_provider_health',
    { connectionId: 1, checkedAt: -1 },
    'provider_health_workspace_connection_checked',
  ),
  workspaceIndex('files', { checksum: 1, size: 1 }, 'files_workspace_checksum_size'),
  workspaceIndex('files', { status: 1, createdAt: -1 }, 'files_workspace_status_created'),
  workspaceIndex('files', { folder: 1, createdAt: -1 }, 'files_workspace_folder_created'),
  { collection: 'files', name: 'files_orphan_cleanup', keys: { status: 1, uploadExpiresAt: 1 } },
  {
    collection: 'billing_plans',
    name: 'billing_plan_code',
    keys: { code: 1 },
    options: { unique: true },
  },
  {
    collection: 'billing_customers',
    name: 'billing_customer_workspace',
    keys: { workspaceId: 1 },
    options: { unique: true },
  },
  {
    collection: 'subscriptions',
    name: 'subscription_workspace',
    keys: { workspaceId: 1 },
    options: { unique: true },
  },
  workspaceIndex('billing_usage', { idempotencyKey: 1 }, 'billing_usage_workspace_idempotency', {
    unique: true,
  }),
  workspaceIndex(
    'billing_usage',
    { category: 1, occurredAt: 1 },
    'billing_usage_workspace_category_time',
  ),
  workspaceIndex(
    'billing_usage_snapshots',
    { periodStart: 1, periodEnd: 1 },
    'billing_snapshot_workspace_period',
    { unique: true },
  ),
  {
    collection: 'billing_webhook_events',
    name: 'billing_webhook_provider_event',
    keys: { providerEventId: 1 },
    options: { unique: true },
  },
  workspaceIndex('billing_invoices', { createdAt: -1 }, 'billing_invoice_workspace_created'),
  workspaceIndex(
    'billing_payment_methods',
    { createdAt: -1 },
    'billing_payment_method_workspace_created',
  ),
  {
    collection: 'billing_coupons',
    name: 'billing_coupon_code',
    keys: { code: 1 },
    options: { unique: true },
  },
  {
    collection: 'outbox_events',
    name: 'outbox_event_id',
    keys: { eventId: 1 },
    options: { unique: true },
  },
  { collection: 'outbox_events', name: 'outbox_dispatch', keys: { status: 1, availableAt: 1 } },
  workspaceIndex(
    'outbox_events',
    { aggregateType: 1, aggregateId: 1, occurredAt: 1 },
    'outbox_workspace_aggregate_time',
  ),
  {
    collection: 'inbox_events',
    name: 'inbox_consumer_event',
    keys: { consumerName: 1, eventId: 1 },
    options: { unique: true },
  },
  {
    collection: 'event_processing_failures',
    name: 'event_failure_retry',
    keys: { status: 1, nextAttemptAt: 1 },
  },
  workspaceIndex(
    'knowledge_sources',
    { idempotencyKey: 1 },
    'knowledge_source_workspace_idempotency',
    { unique: true },
  ),
  workspaceIndex(
    'knowledge_sources',
    { status: 1, createdAt: 1 },
    'knowledge_source_workspace_status_created',
  ),
] as const;

export function workspaceIndex(
  collection: string,
  fields: Record<string, mongo.IndexDirection>,
  name: string,
  options: Omit<mongo.CreateIndexesOptions, 'name'> = {},
): ExplicitIndexDefinition {
  return {
    collection,
    name,
    keys: { workspaceId: 1, ...fields },
    options,
  };
}
