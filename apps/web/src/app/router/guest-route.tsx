import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers';
import { isSafeReturnUrl, routes } from '@/shared/constants/routes';

export interface GuestRouteProps { children?: ReactNode }

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const returnUrl = new URLSearchParams(location.search).get('returnUrl');
  if (isLoading) return null;
  if (isAuthenticated) {
    return <Navigate replace to={isSafeReturnUrl(returnUrl) ? returnUrl : routes.defaultWorkspace} />;
  }
  return children ?? <Outlet />;
}
