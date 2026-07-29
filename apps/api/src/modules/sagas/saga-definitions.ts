import type { SagaDefinition } from './saga.types.js';

const retry = { maxAttempts: 5, timeoutMs: 60_000 };
export const SAGA_DEFINITIONS: readonly SagaDefinition[] = [
  {
    type: 'workspace_provisioning',
    timeoutMs: 15 * 60_000,
    steps: [
      {
        name: 'create_workspace',
        command: 'workspaces.provision',
        ...retry,
        compensation: { name: 'remove_workspace', command: 'workspaces.deprovision' },
      },
      {
        name: 'create_owner_membership',
        command: 'memberships.create_owner',
        ...retry,
        compensation: { name: 'remove_owner_membership', command: 'memberships.remove_owner' },
      },
      { name: 'configure_defaults', command: 'workspace_settings.initialize', ...retry },
      {
        name: 'send_welcome',
        command: 'notifications.workspace_welcome',
        ...retry,
        irreversible: true,
      },
    ],
  },
  {
    type: 'lead_conversion',
    timeoutMs: 10 * 60_000,
    steps: [
      {
        name: 'reserve_conversion',
        command: 'leads.reserve_conversion',
        ...retry,
        compensation: { name: 'release_conversion', command: 'leads.release_conversion' },
      },
      {
        name: 'create_contact',
        command: 'contacts.create_from_lead',
        ...retry,
        compensation: { name: 'archive_contact', command: 'contacts.archive_conversion' },
      },
      {
        name: 'create_deal',
        command: 'deals.create_from_lead',
        ...retry,
        compensation: { name: 'cancel_deal', command: 'deals.cancel_conversion' },
      },
      { name: 'mark_lead_converted', command: 'leads.mark_converted', ...retry },
    ],
  },
  {
    type: 'campaign_launch',
    timeoutMs: 30 * 60_000,
    steps: [
      {
        name: 'freeze_version',
        command: 'campaigns.freeze_version',
        ...retry,
        compensation: { name: 'unfreeze_version', command: 'campaigns.unfreeze_version' },
      },
      {
        name: 'evaluate_audience_consent',
        command: 'consent.evaluate_campaign_audience',
        ...retry,
      },
      {
        name: 'reserve_provider_capacity',
        command: 'campaigns.reserve_provider_capacity',
        ...retry,
        compensation: {
          name: 'release_provider_capacity',
          command: 'campaigns.release_provider_capacity',
        },
      },
      {
        name: 'enqueue_deliveries',
        command: 'campaigns.enqueue_deliveries',
        ...retry,
        irreversible: true,
      },
    ],
  },
  {
    type: 'appointment_external_calendar',
    timeoutMs: 10 * 60_000,
    steps: [
      {
        name: 'hold_slot',
        command: 'appointments.hold_slot',
        ...retry,
        compensation: { name: 'release_slot', command: 'appointments.release_slot' },
      },
      {
        name: 'create_external_event',
        command: 'calendar.create_external_event',
        ...retry,
        compensation: { name: 'delete_external_event', command: 'calendar.delete_external_event' },
      },
      {
        name: 'confirm_appointment',
        command: 'appointments.confirm',
        ...retry,
        compensation: { name: 'cancel_appointment', command: 'appointments.cancel' },
      },
      {
        name: 'notify_attendees',
        command: 'notifications.appointment_confirmation',
        ...retry,
        irreversible: true,
      },
    ],
  },
  {
    type: 'integration_connection',
    timeoutMs: 10 * 60_000,
    steps: [
      { name: 'exchange_credentials', command: 'integrations.exchange_credentials', ...retry },
      { name: 'verify_provider', command: 'integrations.verify_provider', ...retry },
      {
        name: 'register_webhook',
        command: 'integrations.register_webhook',
        ...retry,
        compensation: { name: 'remove_webhook', command: 'integrations.remove_webhook' },
      },
      {
        name: 'activate_connection',
        command: 'integrations.activate_connection',
        ...retry,
        compensation: { name: 'disable_connection', command: 'integrations.disable_connection' },
      },
    ],
  },
  {
    type: 'subscription_activation',
    timeoutMs: 15 * 60_000,
    steps: [
      { name: 'confirm_payment', command: 'billing.confirm_payment', ...retry, irreversible: true },
      {
        name: 'activate_entitlements',
        command: 'billing.activate_entitlements',
        ...retry,
        compensation: { name: 'suspend_entitlements', command: 'billing.suspend_entitlements' },
      },
      { name: 'issue_invoice', command: 'billing.issue_invoice', ...retry, irreversible: true },
    ],
  },
  {
    type: 'workspace_deletion',
    timeoutMs: 24 * 60 * 60_000,
    steps: [
      {
        name: 'disable_access',
        command: 'workspaces.disable_access',
        ...retry,
        compensation: { name: 'restore_access', command: 'workspaces.restore_access' },
      },
      { name: 'disconnect_integrations', command: 'integrations.disconnect_workspace', ...retry },
      {
        name: 'delete_workspace_data',
        command: 'compliance.delete_workspace_data',
        ...retry,
        irreversible: true,
      },
      {
        name: 'finalize_deletion',
        command: 'workspaces.finalize_deletion',
        ...retry,
        irreversible: true,
      },
    ],
  },
  {
    type: 'privacy_deletion_request',
    timeoutMs: 24 * 60 * 60_000,
    steps: [
      { name: 'verify_request', command: 'compliance.verify_deletion_request', ...retry },
      {
        name: 'place_processing_restriction',
        command: 'consent.restrict_processing',
        ...retry,
        compensation: {
          name: 'remove_processing_restriction',
          command: 'consent.remove_processing_restriction',
        },
      },
      {
        name: 'delete_subject_data',
        command: 'compliance.delete_subject_data',
        ...retry,
        irreversible: true,
      },
      {
        name: 'write_tombstone',
        command: 'compliance.write_deletion_tombstone',
        ...retry,
        irreversible: true,
      },
    ],
  },
  {
    type: 'knowledge_source_ingestion',
    timeoutMs: 60 * 60_000,
    steps: [
      {
        name: 'fetch_source',
        command: 'knowledge.fetch_source',
        ...retry,
        compensation: { name: 'delete_fetched_source', command: 'knowledge.delete_fetched_source' },
      },
      { name: 'scan_content', command: 'files.scan_knowledge_source', ...retry },
      {
        name: 'extract_chunks',
        command: 'knowledge.extract_chunks',
        ...retry,
        compensation: { name: 'delete_chunks', command: 'knowledge.delete_chunks' },
      },
      {
        name: 'create_embeddings',
        command: 'knowledge.create_embeddings',
        ...retry,
        compensation: { name: 'delete_embeddings', command: 'knowledge.delete_embeddings' },
      },
      {
        name: 'publish_index',
        command: 'knowledge.publish_index',
        ...retry,
        compensation: { name: 'unpublish_index', command: 'knowledge.unpublish_index' },
      },
    ],
  },
] as const;

export const sagaDefinition = (type: string): SagaDefinition | undefined =>
  SAGA_DEFINITIONS.find((definition) => definition.type === type);
