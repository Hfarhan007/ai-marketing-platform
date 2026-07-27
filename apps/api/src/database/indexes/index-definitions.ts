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
  workspaceIndex(
    'memberships',
    { userId: 1 },
    'membership_workspace_user_unique',
    { unique: true },
  ),
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
  workspaceIndex(
    'workspace_settings',
    {},
    'workspace_settings_workspace_unique',
    { unique: true },
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
