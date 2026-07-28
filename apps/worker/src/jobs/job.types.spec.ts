import { describe, expect, it } from 'vitest';
import { parseJobPayload } from './job.types.js';
describe('job payload validation', () => {
  const valid = {
    workspaceId: '507f1f77bcf86cd799439011',
    correlationId: 'corr',
    idempotencyKey: 'once',
    destination: 'user@example.test',
  };
  it('accepts typed provider payloads', () =>
    expect(parseJobPayload('email', valid)).toMatchObject(valid));
  it('rejects invalid payloads before processing', () =>
    expect(() => parseJobPayload('email', { ...valid, workspaceId: 'wrong' })).toThrow());
});
