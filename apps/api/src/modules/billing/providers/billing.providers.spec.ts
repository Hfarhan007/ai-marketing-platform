import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FakeBillingProvider } from './billing.providers.js';
describe('FakeBillingProvider', () => {
  const provider = new FakeBillingProvider();
  it('creates trial and recurring subscriptions', async () => {
    const trial = await provider.createSubscription({
      customerId: 'c',
      priceId: 'p',
      interval: 'month',
      trialDays: 14,
      idempotencyKey: '1',
    });
    expect(trial.status).toBe('trialing');
    expect(trial.trialEndsAt).toBeInstanceOf(Date);
  });
  it('verifies Stripe-compatible signed test events', () => {
    const payload = Buffer.from(
        JSON.stringify({
          id: 'evt_1',
          type: 'invoice.payment_failed',
          data: { metadata: { workspaceId: 'w' } },
        }),
      ),
      signature = createHmac('sha256', 'fake-webhook-secret').update(payload).digest('hex');
    expect(provider.verifyWebhook(payload, signature).id).toBe('evt_1');
    expect(() => provider.verifyWebhook(payload, 'bad')).toThrow();
  });
});
