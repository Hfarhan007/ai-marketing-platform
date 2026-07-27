import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { planIncludes, type PlanId } from '@/app/config/plans.config';
import { useAuth } from '@/app/providers';
import { routes } from '@/shared/constants/routes';

export function SubscriptionRoute({ children, minimumPlan }: { children?: ReactNode; minimumPlan: PlanId }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user || !planIncludes(user.plan, minimumPlan)) {
    return <Navigate replace state={{ from: location.pathname, minimumPlan }} to={routes.upgradeRequired} />;
  }
  return children ?? <Outlet />;
}
