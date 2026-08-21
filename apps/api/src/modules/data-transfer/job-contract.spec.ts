import { contactImportJobSchema, JOB_CONTRACT_VERSION, QUEUE_NAMES } from '@repo/job-contracts';
import { describe, expect, it } from 'vitest';
import { CONTACT_IMPORT_QUEUE } from './services/data-transfer.service.js';
describe('API/worker contact import contract', () => {
  it('uses the shared queue and envelope schema', () => {
    expect(QUEUE_NAMES).toContain(CONTACT_IMPORT_QUEUE);
    expect(contactImportJobSchema.parse({ jobVersion: JOB_CONTRACT_VERSION, jobId: 'job', workspaceId: '507f1f77bcf86cd799439011', correlationId: 'corr', causationId: 'cause', actorId: '507f191e810c19729de860ea', idempotencyKey: 'once', createdAt: new Date().toISOString(), payload: { entity: 'contacts', transferJobId: '507f1f77bcf86cd799439012', fileId: '507f1f77bcf86cd799439013', storageKey: 'imports/contacts.csv', format: 'csv', mapping: {}, duplicatePolicy: 'skip', dryRun: false } }).payload.entity).toBe('contacts');
  });
});
