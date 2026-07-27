import { type ReactNode, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkspaceContext, type Workspace } from './workspace-context';
import { mockWorkspaces } from './workspace-data';
const defaultWorkspace: Workspace = { id: 'demo-workspace', name: 'Demo Workspace' };

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { workspaceId = 'demo-workspace' } = useParams();
  const navigate = useNavigate();
  const currentWorkspace = useMemo(
    () => mockWorkspaces.find((workspace) => workspace.id === workspaceId) ?? defaultWorkspace,
    [workspaceId],
  );
  const switchWorkspace = useCallback(
    (nextWorkspaceId: string) => {
      const suffix = window.location.pathname.split(`/app/${workspaceId}`)[1] ?? '/dashboard';
      void navigate(`/app/${nextWorkspaceId}${suffix}`);
    },
    [navigate, workspaceId],
  );
  const value = useMemo(
    () => ({ currentWorkspace, switchWorkspace, workspaces: mockWorkspaces }),
    [currentWorkspace, switchWorkspace],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
