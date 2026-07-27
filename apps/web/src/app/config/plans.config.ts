export type PlanId = 'enterprise' | 'free' | 'pro';

export interface PlanConfig {
  id: PlanId;
  limits: { contacts: number | null; seats: number | null };
  name: string;
}

export const plansConfig: Record<PlanId, PlanConfig> = {
  free: { id: 'free', limits: { contacts: 500, seats: 1 }, name: 'Free' },
  pro: { id: 'pro', limits: { contacts: 25_000, seats: 10 }, name: 'Pro' },
  enterprise: {
    id: 'enterprise',
    limits: { contacts: null, seats: null },
    name: 'Enterprise',
  },
};

const planRank: Record<PlanId, number> = { free: 0, pro: 1, enterprise: 2 };

export function planIncludes(current: PlanId, required: PlanId) {
  return planRank[current] >= planRank[required];
}
