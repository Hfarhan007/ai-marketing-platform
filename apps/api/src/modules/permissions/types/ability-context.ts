import type { Permission } from '../constants/permission.catalog.js';

export interface AbilityContext {
  workspaceId: string;
  userId: string;
  membershipId: string;
  permissions: ReadonlySet<Permission | 'admin.*'>;
}

export interface RequestWithAbility {
  ability?: AbilityContext;
}
