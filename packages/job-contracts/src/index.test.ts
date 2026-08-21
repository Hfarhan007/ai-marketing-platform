import { describe, expect, it } from 'vitest';
import { contactImportJobSchema, JOB_CONTRACT_VERSION } from './index.js';
describe('job contracts', () => {
  it('requires the complete contact-import envelope', () => {
    const result = contactImportJobSchema.safeParse({
      jobVersion: JOB_CONTRACT_VERSION, jobId: 'job-1', workspaceId: '507f1f77bcf86cd799439011',
      correlationId: 'corr', causationId: 'request-1', actorId: '507f191e810c19729de860ea',
      idempotencyKey: 'once', createdAt: new Date().toISOString(),
      payload: { entity: 'contacts', transferJobId: '507f1f77bcf86cd799439012', fileId: '507f1f77bcf86cd799439013', storageKey: 'workspace/import.csv', format: 'csv', mapping: {}, duplicatePolicy: 'skip', dryRun: false },
    });
    expect(result.success).toBe(true);
    expect(contactImportJobSchema.safeParse({}).success).toBe(false);
  });
});
