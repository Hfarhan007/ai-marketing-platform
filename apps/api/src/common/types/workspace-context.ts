import type { AuthenticatedPrincipal } from './authenticated-principal.js';

export interface WorkspaceRequestContext {
  workspaceId: string;
  userId: string;
  membershipId: string;
  roleIds: string[];
}

export interface RequestWithWorkspaceContext {
  headers: Record<string, string | string[] | undefined>;
  principal?: AuthenticatedPrincipal;
  workspaceContext?: WorkspaceRequestContext;
}
