import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { hasPermission, type Permission } from '@/app/config/permissions.config';
import { useAuth } from '@/app/providers';
import { routes } from '@/shared/constants/routes';

export interface PermissionRouteProps { children?: ReactNode; permission: Permission }

export function PermissionRoute({ children, permission }: PermissionRouteProps) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user || !hasPermission(user.role, permission)) {
    return <Navigate replace state={{ from: location.pathname, reason: 'permission' }} to={routes.unauthorized} />;
  }
  return children ?? <Outlet />;
}
