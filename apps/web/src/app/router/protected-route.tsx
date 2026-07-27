import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers';
import { routes } from '@/shared/constants/routes';
import { LoadingOverlay } from '@/shared/ui';

export interface ProtectedRouteProps { children?: ReactNode }

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingOverlay loading><div className="min-h-screen" /></LoadingOverlay>;
  if (!isAuthenticated) {
    const returnUrl = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace state={{ from: returnUrl }} to={`${routes.login}?returnUrl=${encodeURIComponent(returnUrl)}`} />;
  }
  return children ?? <Outlet />;
}
