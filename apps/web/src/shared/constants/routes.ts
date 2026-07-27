const DEFAULT_WORKSPACE_ID = 'demo-workspace';

export function isSafeReturnUrl(value: string | null): value is string {
  return Boolean(value?.startsWith('/') && !value.startsWith('//'));
}

export function workspacePath(workspaceId: string, path = 'dashboard') {
  const safeWorkspaceId = encodeURIComponent(workspaceId);
  const safePath = path.replace(/^\/+/, '');
  return `/app/${safeWorkspaceId}/${safePath}`;
}

export const routes = {
  home: '/',
  login: '/login',
  register: '/register',
  unauthorized: '/unauthorized',
  upgradeRequired: '/upgrade-required',
  notFound: '/not-found',
  defaultWorkspace: workspacePath(DEFAULT_WORKSPACE_ID),
  workspace: workspacePath,
} as const;
