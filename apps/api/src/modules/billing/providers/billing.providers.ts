import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import Stripe from 'stripe';
import type { BillingProvider, ProviderSubscription } from '../types/billing-provider.js';
import type { BillingInterval } from '../schemas/billing.schemas.js';

@Injectable()
export class FakeBillingProvider implements BillingProvider {
  createCustomer() {
    return Promise.resolve({ id: `cus_fake_${randomUUID()}` });
  }
  createSubscription(input: { customerId: string; interval: BillingInterval; trialDays: number }) {
    const start = new Date(),
      end = new Date(start);
    if (input.interval === 'year') end.setUTCFullYear(end.getUTCFullYear() + 1);
    else end.setUTCMonth(end.getUTCMonth() + 1);
    const value: ProviderSubscription = {
      id: `sub_fake_${randomUUID()}`,
      customerId: input.customerId,
      status: input.trialDays ? 'trialing' : 'active',
      currentPeriodStart: start,
      currentPeriodEnd: end,
      ...(input.trialDays
        ? { trialEndsAt: new Date(start.valueOf() + input.trialDays * 86_400_000) }
        : {}),
    };
    return Promise.resolve(value);
  }
  updateSubscription(input: { subscriptionId: string }) {
    const start = new Date(),
      end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return Promise.resolve({
      id: input.subscriptionId,
      customerId: 'unchanged',
      status: 'active',
      currentPeriodStart: start,
      currentPeriodEnd: end,
    });
  }
  cancelSubscription() {
    return Promise.resolve();
  }
  verifyWebhook(payload: Buffer, signature: string) {
    const secret = 'fake-webhook-secret',
      expected = createHmac('sha256', secret).update(payload).digest('hex'),
      a = Buffer.from(signature),
      b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new Error('Invalid webhook signature');
    return JSON.parse(payload.toString()) as {
      id: string;
      type: string;
      data: Record<string, unknown>;
    };
  }
}

@Injectable()
export class StripeBillingProvider implements BillingProvider {
  private readonly stripe?: Stripe;
  private readonly webhookSecret: string | undefined;
  constructor(config: ConfigService) {
    const key = config.get<string>('billing.stripeSecretKey');
    this.webhookSecret = config.get<string>('billing.stripeWebhookSecret');
    if (key) this.stripe = new Stripe(key);
  }
  private client() {
    if (!this.stripe) throw new ServiceUnavailableException('Stripe is not configured');
    return this.stripe;
  }
  async createCustomer(input: { workspaceId: string; email: string; name?: string }) {
    const value = await this.client().customers.create({
      email: input.email,
      metadata: { workspaceId: input.workspaceId },
      ...(input.name ? { name: input.name } : {}),
    });
    return { id: value.id };
  }
  async createSubscription(input: {
    customerId: string;
    priceId: string;
    trialDays: number;
    coupon?: string;
    idempotencyKey: string;
  }) {
    const value = await this.client().subscriptions.create(
      {
        customer: input.customerId,
        items: [{ price: input.priceId }],
        ...(input.trialDays ? { trial_period_days: input.trialDays } : {}),
        ...(input.coupon ? { discounts: [{ coupon: input.coupon }] } : {}),
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return this.map(value, input.customerId);
  }
  async updateSubscription(input: {
    subscriptionId: string;
    priceId: string;
    proration: 'invoice_now' | 'none';
    idempotencyKey: string;
  }) {
    const existing = await this.client().subscriptions.retrieve(input.subscriptionId),
      item = existing.items.data[0];
    if (!item) throw new Error('Subscription has no line item');
    const value = await this.client().subscriptions.update(
      input.subscriptionId,
      {
        items: [{ id: item.id, price: input.priceId }],
        proration_behavior: input.proration === 'invoice_now' ? 'always_invoice' : 'none',
      },
      { idempotencyKey: input.idempotencyKey },
    );
    return this.map(value, typeof value.customer === 'string' ? value.customer : value.customer.id);
  }
  async cancelSubscription(id: string, atPeriodEnd: boolean) {
    if (atPeriodEnd) await this.client().subscriptions.update(id, { cancel_at_period_end: true });
    else await this.client().subscriptions.cancel(id);
  }
  verifyWebhook(payload: Buffer, signature: string) {
    if (!this.webhookSecret)
      throw new ServiceUnavailableException('Stripe webhook secret is not configured');
    const event = this.client().webhooks.constructEvent(payload, signature, this.webhookSecret);
    return {
      id: event.id,
      type: event.type,
      data: JSON.parse(JSON.stringify(event.data.object)) as Record<string, unknown>,
    };
  }
  private map(value: Stripe.Subscription, customerId: string): ProviderSubscription {
    const item = value.items.data[0];
    const start = item?.current_period_start ?? Math.floor(Date.now() / 1000),
      end = item?.current_period_end ?? start;
    return {
      id: value.id,
      customerId,
      status: value.status,
      currentPeriodStart: new Date(start * 1000),
      currentPeriodEnd: new Date(end * 1000),
      ...(value.trial_end ? { trialEndsAt: new Date(value.trial_end * 1000) } : {}),
    };
  }
}

@Injectable()
export class BillingProviderRegistry {
  constructor(
    private readonly config: ConfigService,
    private readonly fake: FakeBillingProvider,
    private readonly stripe: StripeBillingProvider,
  ) {}
  get(): BillingProvider {
    const provider = this.config.get<string>('billing.provider');
    if (provider === 'fake') return this.fake;
    if (provider === 'stripe') return this.stripe;
    throw new ServiceUnavailableException('Billing provider is not configured');
  }
}
