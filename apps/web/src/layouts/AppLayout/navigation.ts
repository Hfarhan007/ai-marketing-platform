import { navigationConfig, type NavigationItem } from '@/app/config/navigation.config';
import { hasPermission, type Role } from '@/app/config/permissions.config';
import { isFeatureEnabled } from '@/app/config/feature-flags.config';
import { planIncludes, type PlanId } from '@/app/config/plans.config';

export function getVisibleNavigation(role: Role, plan: PlanId) {
  return navigationConfig.filter(({ featureFlag, minimumPlan, permission }) =>
    (!permission || hasPermission(role, permission))
    && (!featureFlag || isFeatureEnabled(featureFlag))
    && (!minimumPlan || planIncludes(plan, minimumPlan)));
}

export function groupNavigation(items: readonly NavigationItem[]) {
  return items.reduce<Array<{ label: NavigationItem['group']; items: NavigationItem[] }>>((groups, item) => {
    const group = groups.find((candidate) => candidate.label === item.group);
    if (group) group.items.push(item);
    else groups.push({ label: item.group, items: [item] });
    return groups;
  }, []);
}
