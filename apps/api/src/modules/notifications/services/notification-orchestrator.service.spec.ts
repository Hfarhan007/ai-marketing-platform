import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { EventRedactor } from '../../../events/event-redactor.service.js';
import { NotificationOrchestrator } from './notification-orchestrator.service.js';
import { QuietHoursService } from './quiet-hours.service.js';
const userId = new Types.ObjectId().toHexString();
const event = {
  eventId: 'event-1',
  eventType: 'task.reminder',
  aggregateType: 'task',
  aggregateId: new Types.ObjectId().toHexString(),
  workspaceId: new Types.ObjectId().toHexString(),
  payload: { userId, email: 'user@example.com', consent: { email: true }, taskName: 'Follow up' },
  metadata: {},
  correlationId: 'correlation-1',
  occurredAt: '2026-07-28T10:00:00Z',
};
function fixture(preference: Record<string, unknown> | null = null) {
  const repository = {
    definition: vi
      .fn()
      .mockResolvedValue({
        key: 'task_reminder',
        channels: ['in_app', 'email'],
        deliveryMode: 'immediate',
        consentRequired: false,
        critical: false,
        allowCriticalOverride: false,
      }),
    preference: vi.fn().mockResolvedValue(preference),
    template: vi.fn().mockResolvedValue({ subject: 'Reminder', body: '{{taskName}}' }),
    suppressed: vi.fn().mockResolvedValue(false),
    reserve: vi.fn().mockResolvedValue({ value: { _id: new Types.ObjectId() }, duplicate: false }),
  };
  const queue = { add: vi.fn() };
  return {
    service: new NotificationOrchestrator(
      repository as never,
      new QuietHoursService(),
      new EventRedactor(),
      queue as never,
    ),
    repository,
    queue,
  };
}
describe('NotificationOrchestrator', () => {
  it('resolves preferences per channel and suppresses disabled delivery', async () => {
    const { service, repository, queue } = fixture({
      channels: { in_app: true, email: false },
      deliveryMode: 'immediate',
      timezone: 'UTC',
      locale: 'en',
      quietHours: null,
    });
    await expect(service.consume(event)).resolves.toEqual({ created: 1, ignored: false });
    expect(repository.reserve).toHaveBeenCalledTimes(1);
    expect(repository.reserve).toHaveBeenCalledWith(expect.objectContaining({ channel: 'in_app' }));
    expect(queue.add).toHaveBeenCalledTimes(1);
  });
  it('does not enqueue duplicate delivery requests', async () => {
    const { service, repository, queue } = fixture();
    repository.reserve.mockResolvedValue({ value: { _id: new Types.ObjectId() }, duplicate: true });
    await expect(service.consume(event)).resolves.toEqual({ created: 0, ignored: false });
    expect(queue.add).not.toHaveBeenCalled();
  });
  it('enforces consent for external reminder channels', async () => {
    const { service, repository } = fixture();
    repository.definition.mockResolvedValue({
      key: 'task_reminder',
      channels: ['email'],
      deliveryMode: 'immediate',
      consentRequired: true,
      critical: false,
      allowCriticalOverride: false,
    });
    await service.consume({ ...event, payload: { ...event.payload, consent: { email: false } } });
    expect(repository.reserve).not.toHaveBeenCalled();
  });
});
