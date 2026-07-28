import type { BillingInterval } from '../schemas/billing.schemas.js';
export interface ProviderSubscription {
  id: string;
  customerId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
}
export interface BillingProvider {
  createCustomer(input: {
    workspaceId: string;
    email: string;
    name?: string;
  }): Promise<{ id: string }>;
  createSubscription(input: {
    customerId: string;
    priceId: string;
    interval: BillingInterval;
    trialDays: number;
    coupon?: string;
    idempotencyKey: string;
  }): Promise<ProviderSubscription>;
  updateSubscription(input: {
    subscriptionId: string;
    priceId: string;
    proration: 'invoice_now' | 'none';
    idempotencyKey: string;
  }): Promise<ProviderSubscription>;
  cancelSubscription(subscriptionId: string, atPeriodEnd: boolean): Promise<void>;
  verifyWebhook(
    payload: Buffer,
    signature: string,
  ): { id: string; type: string; data: Record<string, unknown> };
}
