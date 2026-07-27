import type { ReactNode } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { isKnownWorkspace } from '@/app/providers/workspace-data';
import { routes } from '@/shared/constants/routes';

export function WorkspaceRoute({ children }: { children?: ReactNode }) {
  const { workspaceId } = useParams();
  if (!isKnownWorkspace(workspaceId)) return <Navigate replace to={routes.notFound} />;
  return children ?? <Outlet />;
}
