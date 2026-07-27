import type { Workspace } from './workspace-context';

export const mockWorkspaces: readonly Workspace[] = [
  { id: 'demo-workspace', name: 'Demo Workspace' },
  { id: 'acme-studio', name: 'Acme Studio' },
  { id: 'northstar-labs', name: 'Northstar Labs' },
];

export function isKnownWorkspace(workspaceId: string | undefined) {
  return Boolean(workspaceId && mockWorkspaces.some((workspace) => workspace.id === workspaceId));
}
