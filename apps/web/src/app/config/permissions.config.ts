export const roles = ['owner', 'admin', 'manager', 'member', 'viewer'] as const;
export type Role = (typeof roles)[number];

export const permissions = [
  'campaigns:read',
  'campaigns:write',
  'contacts:read',
  'contacts:write',
  'admin:access',
  'settings:manage',
  'team:manage',
] as const;
export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<Role, readonly Permission[]> = {
  owner: permissions,
  admin: permissions,
  manager: ['campaigns:read', 'campaigns:write', 'contacts:read', 'contacts:write'],
  member: ['campaigns:read', 'campaigns:write', 'contacts:read'],
  viewer: ['campaigns:read', 'contacts:read'],
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}
