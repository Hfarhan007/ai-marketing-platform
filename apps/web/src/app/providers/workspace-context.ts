import { createContext, useContext } from 'react';

export interface Workspace {
  id: string;
  name: string;
}

export interface WorkspaceContextValue {
  currentWorkspace: Workspace;
  switchWorkspace: (workspaceId: string) => void;
  workspaces: readonly Workspace[];
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
}
