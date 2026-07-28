import { describe, expect, it } from 'vitest';
import { EventRedactor } from './event-redactor.service.js';
describe('EventRedactor', () => {
  it('redacts nested secrets and private message content', () => {
    const value = new EventRedactor().redact({
      email: 'safe@example.test',
      password: 'secret',
      nested: { accessToken: 'token', messageContent: 'private' },
    });
    expect(value).toEqual({
      email: 'safe@example.test',
      password: '[REDACTED]',
      nested: { accessToken: '[REDACTED]', messageContent: '[REDACTED]' },
    });
  });
});
