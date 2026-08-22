import { describe, expect, it, vi } from 'vitest';
import { ExternalLeadIngestionService } from './external-lead-ingestion.service.js';

const base = {
  workspaceId: '64b64b64b64b64b64b64b64b', actorId: '64b64b64b64b64b64b64b64c',
  provider: 'facebook', externalLeadId: 'lead-123', fullName: 'Ada Lovelace',
  email: 'ADA@example.com', phone: '+1 (555) 0100', source: 'facebook',
  rawPayload: { id: 'lead-123' }, receivedAt: new Date('2026-08-21T00:00:00.000Z'),
};

function setup(existing: Record<string, unknown> | null = null) {
  const stored = { _id: '64b64b64b64b64b64b64b64d', version: 0, name: 'Ada Lovelace', email: 'ada@example.com', phone: '+15550100', source: 'facebook', normalizedEmail: 'ada@example.com', normalizedPhone: '+15550100', qualification: 'unqualified', status: 'new', providerMetadata: {}, scoreHistory: [], qualificationAuditTrail: [], aiSummaryReferenceIds: [] };
  const leads = {
    findExternal: vi.fn().mockResolvedValue(existing), findIdentity: vi.fn().mockResolvedValue(null),
    createEntity: vi.fn().mockResolvedValue(stored), updateEntity: vi.fn().mockResolvedValue({ ...stored, ...existing }),
  };
  const events = { record: vi.fn().mockResolvedValue(undefined) };
  const queue = { add: vi.fn().mockResolvedValue({ id: 'job-1' }) };
  return { service: new ExternalLeadIngestionService(leads as never, events as never, queue as never), leads, events, queue };
}

describe('ExternalLeadIngestionService', () => {
  it('creates one tenant-scoped CRM lead and queues qualification', async () => {
    const value = setup();
    const result = await value.service.ingest(base);
    expect(result).toEqual({ leadId: '64b64b64b64b64b64b64b64d', created: true, duplicate: false, qualificationQueued: true });
    expect(value.leads.createEntity).toHaveBeenCalledWith(base.workspaceId, base.actorId, expect.objectContaining({ externalProvider: 'facebook', externalLeadId: 'lead-123', normalizedEmail: 'ada@example.com', normalizedPhone: '+15550100' }));
    expect(value.events.record).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'lead', action: 'created', workspaceId: base.workspaceId }));
    expect(value.queue.add).toHaveBeenCalledWith('lead.qualify', expect.objectContaining({ leadId: '64b64b64b64b64b64b64b64d' }), expect.objectContaining({ attempts: 3 }));
    expect(value.queue.add).toHaveBeenCalledWith('lead.workflow', expect.objectContaining({ leadId: '64b64b64b64b64b64b64b64d', provider: 'facebook', externalLeadId: 'lead-123' }), expect.objectContaining({ attempts: 5 }));
  });

  it('updates a duplicate external lead without queuing another qualification', async () => {
    const existing = { _id: '64b64b64b64b64b64b64b64d', version: 4, name: 'Preferred CRM Name', email: 'good@example.com', phone: '+15550100', source: 'referral', normalizedEmail: 'good@example.com', normalizedPhone: '+15550100', externalProvider: 'facebook', externalLeadId: 'lead-123', providerMetadata: {}, qualification: 'sales_qualified' };
    const value = setup(existing);
    const result = await value.service.ingest({ ...base, fullName: '', email: '', phone: '' });
    expect(result).toMatchObject({ created: false, duplicate: true, qualificationQueued: false });
    expect(value.leads.updateEntity).toHaveBeenCalledWith(base.workspaceId, String(existing._id), base.actorId, 4, expect.objectContaining({ name: 'Preferred CRM Name', email: 'good@example.com' }));
    expect(value.leads.updateEntity.mock.calls[0]?.[4]).not.toHaveProperty('qualification');
    expect(value.queue.add).not.toHaveBeenCalledWith('lead.qualify', expect.anything(), expect.anything());
    expect(value.queue.add).toHaveBeenCalledWith('lead.workflow', expect.anything(), expect.anything());
  });

  it('reconciles matching identity inside the same workspace', async () => {
    const existing = { _id: '64b64b64b64b64b64b64b64d', version: 1, name: 'Ada', email: 'ada@example.com', phone: '', source: 'manual', normalizedEmail: 'ada@example.com', normalizedPhone: '', externalProvider: null, externalLeadId: null, providerMetadata: {} };
    const value = setup();
    value.leads.findIdentity.mockResolvedValue(existing);
    const result = await value.service.ingest(base);
    expect(result.created).toBe(false);
    expect(value.leads.findIdentity).toHaveBeenCalledWith(base.workspaceId, 'ada@example.com', '+15550100');
    expect(value.leads.updateEntity).toHaveBeenCalledWith(base.workspaceId, String(existing._id), base.actorId, 1, expect.objectContaining({ externalProvider: 'facebook', externalLeadId: 'lead-123' }));
  });

  it('uses workspace scope for both external-id and identity lookup', async () => {
    const value = setup();
    await value.service.ingest({ ...base, workspaceId: '74b64b64b64b64b64b64b64b' });
    expect(value.leads.findExternal).toHaveBeenCalledWith('74b64b64b64b64b64b64b64b', 'facebook', 'lead-123');
    expect(value.leads.findIdentity).toHaveBeenCalledWith('74b64b64b64b64b64b64b64b', 'ada@example.com', '+15550100');
    expect(value.leads.createEntity).toHaveBeenCalledWith('74b64b64b64b64b64b64b64b', base.actorId, expect.anything());
  });
});
