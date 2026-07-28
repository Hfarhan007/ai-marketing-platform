import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SignedFixtureProviderAdapter } from './provider.registry.js';
describe('signed provider fixtures',()=>{
 it('accepts a valid signed payload inside tolerance',()=>{const adapter=new SignedFixtureProviderAdapter('stripe'),body=Buffer.from(JSON.stringify({id:'evt_1',type:'payment.succeeded'})),timestamp=String(Math.floor(Date.now()/1000)),secret='fixture-secret',signature=createHmac('sha256',secret).update(`${timestamp}.`).update(body).digest('hex');expect(adapter.verifyWebhook(body,{'x-webhook-timestamp':timestamp,'x-webhook-signature':`sha256=${signature}`},secret,300)).toBe(true)});
 it('rejects tampering and stale signed payloads',()=>{const adapter=new SignedFixtureProviderAdapter('shopify'),body=Buffer.from('{"id":"evt_1"}'),secret='fixture-secret',stale=String(Math.floor(Date.now()/1000)-1000),signature=createHmac('sha256',secret).update(`${stale}.`).update(body).digest('hex');expect(adapter.verifyWebhook(Buffer.from('{"id":"tampered"}'),{'x-webhook-timestamp':stale,'x-webhook-signature':signature},secret,300)).toBe(false)});
});
