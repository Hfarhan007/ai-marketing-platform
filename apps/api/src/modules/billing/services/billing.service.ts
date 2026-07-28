import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import type { ChangePlanDto, RecordUsageDto, StartSubscriptionDto } from '../dto/billing.dto.js';
import { BillingProviderRegistry } from '../providers/billing.providers.js';
import { BillingRepository } from '../repositories/billing.repository.js';
import {
  USAGE_CATEGORIES,
  type UsageCategory,
} from '../schemas/billing.schemas.js';
import { SubscriptionStateMachine, type BillingEvent } from './subscription-state-machine.js';

@Injectable()
export class BillingService {
  constructor(
    private readonly repo: BillingRepository,
    private readonly providers: BillingProviderRegistry,
    private readonly states: SubscriptionStateMachine,
    private readonly config: ConfigService,
  ) {}
  plans() {
    return this.repo.listPlans();
  }
  async current(c: WorkspaceRequestContext) {
    const subscription = await this.repo.subscription(c.workspaceId);
    if (!subscription) return null;
    return { ...subscription, entitlements: await this.entitlements(c.workspaceId) };
  }
  async start(c: WorkspaceRequestContext, d: StartSubscriptionDto) {
    if (await this.repo.subscription(c.workspaceId))
      throw new ConflictException('Workspace already has a subscription');
    const plan = await this.repo.plan(d.planId);
    let customer = await this.repo.customer(c.workspaceId);
    if (!customer) {
      const remote = await this.providers
        .get()
        .createCustomer({
          workspaceId: c.workspaceId,
          email: d.billingEmail,
          ...(d.billingName ? { name: d.billingName } : {}),
        });
      customer = (
        await this.repo.createCustomer({
          workspaceId: new Types.ObjectId(c.workspaceId),
          providerCustomerId: remote.id,
          email: d.billingEmail,
          name: d.billingName ?? '',
        })
      ).toObject();
    }
    const priceId = d.interval === 'month' ? plan.stripeMonthlyPriceId : plan.stripeYearlyPriceId;
    if (!priceId && this.config.get<string>('billing.provider') === 'stripe')
      throw new ConflictException('Plan is not configured for Stripe');
    const remote = await this.providers
      .get()
      .createSubscription({
        customerId: customer.providerCustomerId,
        priceId: priceId ?? `${plan.code}_${d.interval}`,
        interval: d.interval,
        trialDays: plan.trialDays,
        ...(d.coupon ? { coupon: d.coupon } : {}),
        idempotencyKey: d.idempotencyKey,
      });
    return this.repo.createSubscription({
      workspaceId: new Types.ObjectId(c.workspaceId),
      planId: plan._id,
      providerSubscriptionId: remote.id,
      interval: d.interval,
      status: remote.status === 'trialing' ? 'trialing' : 'active',
      currentPeriodStart: remote.currentPeriodStart,
      currentPeriodEnd: remote.currentPeriodEnd,
      ...(remote.trialEndsAt ? { trialEndsAt: remote.trialEndsAt } : {}),
      couponCode: d.coupon,
      version: 0,
    });
  }
  async changePlan(c: WorkspaceRequestContext, d: ChangePlanDto) {
    const current = await this.requiredSubscription(c.workspaceId),
      oldPlan = await this.repo.plan(String(current.planId)),
      next = await this.repo.plan(d.planId);
    const upgrade =
      (current.interval === 'month' ? next.monthlyPrice : next.yearlyPrice) >
      (current.interval === 'month' ? oldPlan.monthlyPrice : oldPlan.yearlyPrice);
    if (!upgrade)
      return this.repo.updateSubscription(c.workspaceId, current.version, {
        scheduledPlanId: next._id,
      });
    const priceId =
      current.interval === 'month' ? next.stripeMonthlyPriceId : next.stripeYearlyPriceId;
    await this.providers
      .get()
      .updateSubscription({
        subscriptionId: current.providerSubscriptionId,
        priceId: priceId ?? `${next.code}_${current.interval}`,
        proration: 'invoice_now',
        idempotencyKey: d.idempotencyKey,
      });
    return this.repo.updateSubscription(c.workspaceId, current.version, {
      planId: next._id,
      scheduledPlanId: null,
      status: 'active',
    });
  }
  async cancel(c: WorkspaceRequestContext, atPeriodEnd = true) {
    const current = await this.requiredSubscription(c.workspaceId);
    await this.providers.get().cancelSubscription(current.providerSubscriptionId, atPeriodEnd);
    return this.repo.updateSubscription(
      c.workspaceId,
      current.version,
      atPeriodEnd ? { cancelAtPeriodEnd: true } : { status: 'cancelled', cancelledAt: new Date() },
    );
  }
  async applyEvent(workspaceId: string, event: BillingEvent) {
    const current = await this.requiredSubscription(workspaceId),
      status = this.states.transition(current.status, event),
      graceDays = this.config.get<number>('billing.gracePeriodDays') ?? 7;
    return this.repo.updateSubscription(workspaceId, current.version, {
      status,
      ...(status === 'grace_period'
        ? { graceEndsAt: new Date(Date.now() + graceDays * 86_400_000) }
        : {}),
      ...(status === 'cancelled' ? { cancelledAt: new Date() } : {}),
    });
  }
  async recordUsage(c: WorkspaceRequestContext, d: RecordUsageDto) {
    await this.enforce(c.workspaceId, d.category, d.quantity);
    const created = await this.repo.addUsage(
      c.workspaceId,
      d.category,
      d.quantity,
      d.idempotencyKey,
    );
    return { recorded: Boolean(created), duplicate: !created };
  }
  async enforce(workspaceId: string, category: UsageCategory, increment = 1) {
    const subscription = await this.requiredSubscription(workspaceId);
    if (!['trialing', 'active', 'grace_period'].includes(subscription.status))
      throw new ForbiddenException('Subscription is not entitled');
    const plan = await this.repo.plan(String(subscription.planId)),
      totals = await this.repo.usage(
        workspaceId,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
      ),
      limit = plan.limits[category];
    if (limit >= 0 && (totals[category] ?? 0) + increment > limit)
      throw new ForbiddenException(`Usage limit exceeded for ${category}`);
  }
  async entitlements(workspaceId: string) {
    const subscription = await this.requiredSubscription(workspaceId),
      plan = await this.repo.plan(String(subscription.planId)),
      usage = await this.repo.usage(
        workspaceId,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
      );
    return {
      status: subscription.status,
      features: plan.features,
      limits: plan.limits,
      usage: Object.fromEntries(USAGE_CATEGORIES.map((key) => [key, usage[key] ?? 0])),
    };
  }
  async snapshot(workspaceId: string) {
    const subscription = await this.requiredSubscription(workspaceId),
      plan = await this.repo.plan(String(subscription.planId)),
      totals = await this.repo.usage(
        workspaceId,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
      ),
      complete = Object.fromEntries(USAGE_CATEGORIES.map((k) => [k, totals[k] ?? 0])) as Record<
        UsageCategory,
        number
      >,
      overages = Object.fromEntries(
        USAGE_CATEGORIES.map(
          (k): [UsageCategory, number] => [k, Math.max(0, complete[k] - plan.limits[k])],
        ).filter((entry) => entry[1] > 0),
      );
    return this.repo.snapshot({
      workspaceId: new Types.ObjectId(workspaceId),
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      totals: complete,
      overages,
    });
  }
  private async requiredSubscription(workspaceId: string) {
    const value = await this.repo.subscription(workspaceId);
    if (!value) throw new NotFoundException('Subscription not found');
    return value;
  }
}
