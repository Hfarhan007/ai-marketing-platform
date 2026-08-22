export const roles = ['owner', 'admin', 'manager', 'member', 'viewer'] as const;
export type Role = (typeof roles)[number];

export const permissions = [
  'campaigns:read',
  'campaigns:write',
  'contacts:read',
  'contacts:write',
  'leads:read',
  'admin:access',
  'settings:manage',
  'team:manage',
] as const;
export type Permission = (typeof permissions)[number];

export const rolePermissions: Record<Role, readonly Permission[]> = {
  owner: permissions,
  admin: permissions,
  manager: ['campaigns:read', 'campaigns:write', 'contacts:read', 'contacts:write', 'leads:read'],
  member: ['campaigns:read', 'campaigns:write', 'contacts:read', 'leads:read'],
  viewer: ['campaigns:read', 'contacts:read', 'leads:read'],
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}
