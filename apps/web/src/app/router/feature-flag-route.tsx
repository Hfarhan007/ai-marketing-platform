import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isFeatureEnabled, type FeatureFlag } from '@/app/config/feature-flags.config';
import { routes } from '@/shared/constants/routes';

export function FeatureFlagRoute({ children, flag }: { children?: ReactNode; flag: FeatureFlag }) {
  if (!isFeatureEnabled(flag)) return <Navigate replace to={routes.notFound} />;
  return children ?? <Outlet />;
}
