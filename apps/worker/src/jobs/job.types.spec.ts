import { describe, expect, it } from 'vitest';
import { parseJobPayload } from './job.types.js';
import { contactImportJobSchema } from '@repo/job-contracts';
describe('job payload validation', () => {
  const valid = {
    jobVersion: 1,
    jobId: 'job-1',
    workspaceId: '507f1f77bcf86cd799439011',
    correlationId: 'corr',
    causationId: 'request-1',
    idempotencyKey: 'once',
    payload: { destination: 'user@example.test' },
    createdAt: new Date().toISOString(),
  };
  it('accepts typed provider payloads', () =>
    expect(parseJobPayload('email', valid)).toMatchObject(valid));
  it('rejects invalid payloads before processing', () =>
    expect(() => parseJobPayload('email', { ...valid, workspaceId: 'wrong' })).toThrow());
  it('uses the exact shared contact import schema', () => {
    const contact = { ...valid, payload: { entity: 'contacts', transferJobId: '507f1f77bcf86cd799439012', fileId: '507f1f77bcf86cd799439013', storageKey: 'imports/contacts.csv', format: 'csv', mapping: {}, duplicatePolicy: 'skip', dryRun: false } };
    expect(parseJobPayload('contact-imports', contact)).toEqual(contactImportJobSchema.parse(contact));
  });
});
