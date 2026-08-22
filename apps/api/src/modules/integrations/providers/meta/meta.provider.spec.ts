import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ProviderRegistry } from '../provider.registry.js';
import { mapMetaLead, metaLeadgenChange, metaLeadgenChanges } from './meta-mappers.js';
import { FacebookMetaProviderAdapter, InstagramMetaProviderAdapter } from './meta.provider.js';

const client = { request: vi.fn(), page: vi.fn() };
const config = { get: vi.fn() };
const oauth = { authorizationUrl: vi.fn(), exchange: vi.fn(), refresh: vi.fn(), validate: vi.fn() };
const resources = { discover: vi.fn(), select: vi.fn() };
const ads = { sync: vi.fn() };
const insights = { sync: vi.fn() };

describe('Meta integration foundation', () => {
  it('validates X-Hub-Signature-256 and rejects tampering', () => {
    const adapter = new FacebookMetaProviderAdapter(client as never, config as never, oauth as never, resources as never, ads as never, insights as never), body = Buffer.from('{"entry":[]}'), secret = 'app-secret';
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(adapter.verifyWebhook(body, { 'x-hub-signature-256': `sha256=${signature}` }, secret, 0)).toBe(true);
    expect(adapter.verifyWebhook(Buffer.from('{"entry":[1]}'), { 'x-hub-signature-256': `sha256=${signature}` }, secret, 0)).toBe(false);
  });
  it('extracts leadgen events and preserves unknown form fields', () => {
    const change = metaLeadgenChange({ entry: [{ id: 'page-1', changes: [{ field: 'leadgen', value: { leadgen_id: 'lead-1', form_id: 'form-1', created_time: 1_700_000_000 } }] }] });
    expect(change).toMatchObject({ leadgenId: 'lead-1', pageId: 'page-1', formId: 'form-1' });
    const mapped = mapMetaLead({ id: 'lead-1', field_data: [{ name: 'full_name', values: ['Ada Lovelace'] }, { name: 'email', values: ['ada@example.com'] }, { name: 'favorite_product', values: ['Analytics'] }] });
    expect(mapped).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', fields: { favorite_product: 'Analytics' } });
  });
  it('extracts every leadgen event from a batched Meta delivery', () => {
    const changes=metaLeadgenChanges({entry:[{id:'page-1',changes:[{field:'leadgen',value:{leadgen_id:'lead-1'}},{field:'leadgen',value:{leadgen_id:'lead-2'}}]}]});
    expect(changes.map(({leadgenId})=>leadgenId)).toEqual(['lead-1','lead-2']);
  });
  it('rejects malformed webhook JSON as a permanent client error',async()=>{const adapter=new FacebookMetaProviderAdapter(client as never,config as never,oauth as never,resources as never,ads as never,insights as never);await expect(adapter.handleWebhooks(Buffer.from('{bad json'))).rejects.toMatchObject({response:{code:'META_WEBHOOK_MALFORMED',retryable:false}});});
  it('replaces only Facebook and Instagram fallbacks with Meta adapters', () => {
    const facebook = new FacebookMetaProviderAdapter(client as never, config as never, oauth as never, resources as never, ads as never, insights as never), instagram = new InstagramMetaProviderAdapter(client as never, config as never, oauth as never, resources as never, ads as never, insights as never), highlevel={provider:'highlevel'} as never, registry = new ProviderRegistry(facebook, instagram,highlevel);
    expect(registry.get('facebook')).toBe(facebook);
    expect(registry.get('instagram')).toBe(instagram);
    expect(registry.get('shopify').provider).toBe('shopify');
    expect(registry.get('shopify')).not.toBe(facebook);
  });
});
