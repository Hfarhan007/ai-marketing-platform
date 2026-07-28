import { describe, expect, it, vi } from 'vitest';
import { BillingWebhookService } from './billing-webhook.service.js';
describe('BillingWebhookService', () => {
  it('ignores duplicate webhook events', async () => {
    const provider = {
        verifyWebhook: () => ({
          id: 'evt_1',
          type: 'invoice.payment_failed',
          data: { metadata: { workspaceId: 'w' } },
        }),
      },
      repo = { claimWebhook: vi.fn().mockResolvedValue(false), completeWebhook: vi.fn() },
      billing = { applyEvent: vi.fn() },
      service = new BillingWebhookService(
        { get: () => provider } as never,
        repo as never,
        billing as never,
      );
    await expect(service.receive(Buffer.from('{}'), 'sig')).resolves.toEqual({
      received: true,
      duplicate: true,
    });
    expect(billing.applyEvent).not.toHaveBeenCalled();
  });
});
