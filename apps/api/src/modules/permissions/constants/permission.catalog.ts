export const PERMISSIONS = [
  'contacts.read',
  'contacts.create',
  'contacts.update',
  'contacts.delete',
  'deals.read',
  'deals.manage',
  'inbox.reply',
  'workflows.publish',
  'agents.manage',
  'billing.manage',
  'team.manage',
  'admin.access',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_GROUPS = {
  contactsViewer: ['contacts.read'],
  contactsEditor: ['contacts.read', 'contacts.create', 'contacts.update'],
  contactsManager: ['contacts.read', 'contacts.create', 'contacts.update', 'contacts.delete'],
  dealsManager: ['deals.read', 'deals.manage'],
  workspaceManager: ['team.manage', 'workflows.publish', 'agents.manage'],
} as const satisfies Record<string, readonly Permission[]>;

export type PermissionGroup = keyof typeof PERMISSION_GROUPS;

export const ALLOWED_ADMIN_WILDCARDS = ['admin.*'] as const;
