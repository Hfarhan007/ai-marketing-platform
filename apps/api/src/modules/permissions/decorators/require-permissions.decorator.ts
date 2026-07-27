import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../constants/permission.catalog.js';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';

export interface PermissionRequirement {
  permissions: readonly Permission[];
  mode: 'all' | 'any';
}

export const RequirePermissions = (...permissions: readonly Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, { permissions, mode: 'all' } satisfies PermissionRequirement);

export const RequireAnyPermission = (...permissions: readonly Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, { permissions, mode: 'any' } satisfies PermissionRequirement);
