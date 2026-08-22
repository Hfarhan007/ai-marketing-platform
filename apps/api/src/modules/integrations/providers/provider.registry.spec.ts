import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { HighLevelProviderAdapter } from './highlevel/highlevel.provider.js';
import { FacebookMetaProviderAdapter, InstagramMetaProviderAdapter } from './meta/meta.provider.js';
import { ProviderRegistry, SignedFixtureProviderAdapter, UnsupportedProviderAdapter } from './provider.registry.js';

function registry() {
 const dependency={request:vi.fn(),page:vi.fn()},config={get:vi.fn()},oauth={authorizationUrl:vi.fn(),exchange:vi.fn(),refresh:vi.fn(),validate:vi.fn()},resources={discover:vi.fn(),select:vi.fn()},ads={sync:vi.fn()},insights={sync:vi.fn()};
 const facebook=new FacebookMetaProviderAdapter(dependency as never,config as never,oauth as never,resources as never,ads as never,insights as never);
 const instagram=new InstagramMetaProviderAdapter(dependency as never,config as never,oauth as never,resources as never,ads as never,insights as never);
 const highlevel=new HighLevelProviderAdapter(dependency as never,oauth as never,dependency as never,dependency as never,dependency as never,dependency as never,dependency as never);
 return{value:new ProviderRegistry(facebook,instagram,highlevel),facebook,instagram,highlevel};
}
describe('signed provider fixtures',()=>{
 it('accepts a valid signed payload inside tolerance',()=>{const adapter=new SignedFixtureProviderAdapter('stripe'),body=Buffer.from(JSON.stringify({id:'evt_1',type:'payment.succeeded'})),timestamp=String(Math.floor(Date.now()/1000)),secret='fixture-secret',signature=createHmac('sha256',secret).update(`${timestamp}.`).update(body).digest('hex');expect(adapter.verifyWebhook(body,{'x-webhook-timestamp':timestamp,'x-webhook-signature':`sha256=${signature}`},secret,300)).toBe(true)});
 it('rejects tampering and stale signed payloads',()=>{const adapter=new SignedFixtureProviderAdapter('shopify'),body=Buffer.from('{"id":"evt_1"}'),secret='fixture-secret',stale=String(Math.floor(Date.now()/1000)-1000),signature=createHmac('sha256',secret).update(`${stale}.`).update(body).digest('hex');expect(adapter.verifyWebhook(Buffer.from('{"id":"tampered"}'),{'x-webhook-timestamp':stale,'x-webhook-signature':signature},secret,300)).toBe(false)});
});

describe('ProviderRegistry',()=>{
 it('returns the injected Facebook Meta adapter',()=>{const{value,facebook}=registry();expect(value.get('facebook')).toBe(facebook);expect(value.get('facebook')).toBeInstanceOf(FacebookMetaProviderAdapter)});
 it('returns the injected Instagram Meta-backed adapter',()=>{const{value,instagram}=registry();expect(value.get('instagram')).toBe(instagram);expect(value.get('instagram')).toBeInstanceOf(InstagramMetaProviderAdapter)});
 it('returns the injected HighLevel adapter',()=>{const{value,highlevel}=registry();expect(value.get('highlevel')).toBe(highlevel);expect(value.get('highlevel')).toBeInstanceOf(HighLevelProviderAdapter)});
 it('keeps explicit unhealthy fallbacks for unimplemented providers',async()=>{const{value}=registry();for(const provider of ['shopify','stripe','gmail']as const){const adapter=value.get(provider);expect(adapter).toBeInstanceOf(UnsupportedProviderAdapter);expect(await adapter.validateConnection({}as never)).toBe(false);await expect(adapter.healthCheck({}as never)).resolves.toMatchObject({healthy:false})}});
});
