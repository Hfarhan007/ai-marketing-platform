import { describe, expect, it, vi } from 'vitest';
import { EventRedactor } from '../../events/event-redactor.service.js';
import { ActivityProjectionService } from './activity-projection.service.js';

const event = {
  eventId: 'event-1',
  eventType: 'deal.stage_changed',
  aggregateType: 'deal',
  aggregateId: 'deal-1',
  workspaceId: '507f1f77bcf86cd799439011',
  payload: {
    contactId: '507f1f77bcf86cd799439012',
    token: 'must-not-leak',
  },
  metadata: { actorId: '507f1f77bcf86cd799439013' },
  correlationId: 'correlation-1',
  occurredAt: '2026-07-28T10:00:00.000Z',
};

describe('ActivityProjectionService', () => {
  it('projects a domain event once and preserves event and processing times', async () => {
    const repository = { insert: vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce(null) };
    const service = new ActivityProjectionService(repository as never, new EventRedactor());
    await expect(service.project(event)).resolves.toEqual({
      projected: true,
      duplicate: false,
    });
    await expect(service.project(event)).resolves.toEqual({
      projected: false,
      duplicate: true,
    });
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceEventId: 'event-1',
        type: 'deal_moved',
        occurredAt: new Date(event.occurredAt),
        processedAt: expect.any(Date) as Date,
        correlationId: 'correlation-1',
        data: expect.objectContaining({ token: '[REDACTED]' }) as object,
      }),
    );
  });

  it('stores field diffs with only safe scalar values', async () => {
    const repository = { insert: vi.fn().mockResolvedValue({}) };
    const service = new ActivityProjectionService(repository as never, new EventRedactor());
    await service.project({
      ...event,
      eventId: 'event-2',
      eventType: 'contact.field_changed',
      aggregateType: 'contact',
      payload: {
        field: 'lifecycleStatus',
        from: 'lead',
        to: 'customer',
        rawDocument: { privateContent: 'secret' },
      },
    });
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { field: 'lifecycleStatus', from: 'lead', to: 'customer' },
      }),
    );
  });
});
