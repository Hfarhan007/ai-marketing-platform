import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventBus } from './event-bus';

describe('eventBus', () => {
  afterEach(() => eventBus.clear());
  it('publishes typed events and supports unsubscribe', () => {
    const handler = vi.fn();
    const unsubscribe = eventBus.subscribe('contact.created', handler);
    eventBus.publish('contact.created', { contactId: 'contact-1' });
    unsubscribe();
    eventBus.publish('contact.created', { contactId: 'contact-2' });
    expect(handler).toHaveBeenCalledOnce();
  });
});
