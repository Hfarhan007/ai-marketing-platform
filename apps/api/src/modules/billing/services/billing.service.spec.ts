import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { BillingService } from './billing.service.js';
const context = {
  workspaceId: '507f1f77bcf86cd799439011',
  userId: '507f1f77bcf86cd799439012',
  correlationId: 'c',
};
const sub = {
  workspaceId: context.workspaceId,
  planId: '507f1f77bcf86cd799439013',
  providerSubscriptionId: 'sub',
  interval: 'month' as const,
  status: 'active' as const,
  currentPeriodStart: new Date('2026-01-01'),
  currentPeriodEnd: new Date('2026-02-01'),
  version: 0,
  cancelAtPeriodEnd: false,
};
function setup(usage = 0) {
  const repo = {
    subscription: vi.fn().mockResolvedValue(sub),
    plan: vi
      .fn()
      .mockResolvedValue({
        _id: sub.planId,
        monthlyPrice: 10,
        yearlyPrice: 100,
        limits: { contacts: 10 },
        features: [],
      }),
    usage: vi.fn().mockResolvedValue({ contacts: usage }),
    updateSubscription: vi.fn().mockResolvedValue({}),
    addUsage: vi.fn().mockResolvedValue({}),
  };
  const providers = { get: () => ({ updateSubscription: vi.fn(), cancelSubscription: vi.fn() }) };
  return {
    service: new BillingService(
      repo as never,
      providers as never,
      { transition: () => 'active' } as never,
      { get: () => 7 } as never,
    ),
    repo,
  };
}
describe('BillingService', () => {
  it('enforces usage limits server-side', async () => {
    const { service } = setup(10);
    await expect(service.enforce(context.workspaceId, 'contacts', 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('allows usage below a plan limit', async () => {
    const { service } = setup(8);
    await expect(service.enforce(context.workspaceId, 'contacts', 1)).resolves.toBeUndefined();
  });
  it('schedules downgrades and applies upgrades immediately', async () => {
    const { service, repo } = setup();
    repo.plan
      .mockResolvedValueOnce({ _id: sub.planId, monthlyPrice: 10, yearlyPrice: 100 })
      .mockResolvedValueOnce({ _id: 'low', monthlyPrice: 5, yearlyPrice: 50 });
    await service.changePlan(context, { planId: 'low', idempotencyKey: 'd' });
    expect(repo.updateSubscription).toHaveBeenCalledWith(context.workspaceId, 0, {
      scheduledPlanId: 'low',
    });
    repo.plan
      .mockResolvedValueOnce({ _id: sub.planId, monthlyPrice: 10, yearlyPrice: 100 })
      .mockResolvedValueOnce({ _id: 'high', monthlyPrice: 20, yearlyPrice: 200, code: 'high' });
    await service.changePlan(context, { planId: 'high', idempotencyKey: 'u' });
    expect(repo.updateSubscription).toHaveBeenLastCalledWith(context.workspaceId, 0, {
      planId: 'high',
      scheduledPlanId: null,
      status: 'active',
    });
  });
});
