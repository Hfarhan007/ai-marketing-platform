import { describe, expect, it } from 'vitest';
import { FakeProviderAdapter, ProviderAdapterRegistry } from '../providers/provider-adapter.js';
import type { CampaignVariant } from '../types/campaign.types.js';
import { CampaignPolicyService } from './campaign-policy.service.js';
describe('campaign policies',()=>{
 const policy=new CampaignPolicyService();
 it('excludes recipients without explicit channel consent',()=>{expect(policy.isConsented({communicationPreferences:{email:true},consentSummary:{email:false}},'email')).toBe(false);expect(policy.isConsented({communicationPreferences:{email:true},consentSummary:{email:true}},'email')).toBe(true)});
 it('defers deliveries during quiet hours in the recipient timezone',()=>{const now=new Date('2026-08-03T03:00:00Z');const next=policy.nextDelivery(now,'America/New_York',{startMinutes:1320,endMinutes:480});expect(next.valueOf()).toBeGreaterThan(now.valueOf())});
 it('uses recipient timezones independently',()=>{const now=new Date('2026-08-03T03:00:00Z');expect(policy.nextDelivery(now,'Asia/Tokyo',{startMinutes:1320,endMinutes:480})).toEqual(now);expect(policy.nextDelivery(now,'America/New_York',{startMinutes:1320,endMinutes:480}).valueOf()).toBeGreaterThan(now.valueOf())});
 it('assigns stable weighted A/B variants',()=>{const variants:CampaignVariant[]=[{id:'a',weight:50,content:'A'},{id:'b',weight:50,content:'B'}];expect(policy.assignVariant('contact-1',variants)).toEqual(policy.assignVariant('contact-1',variants))});
 it('applies personalization defaults',()=>{expect(policy.personalize('Hi {{ firstName }}, {{company}}',{firstName:'Ava'},{company:'Acme'})).toBe('Hi Ava, Acme')});
 it('keeps fake providers test-only and supports retry simulation',async()=>{const registry=new ProviderAdapterRegistry(),fake=new FakeProviderAdapter();fake.failuresRemaining=1;registry.register('email',fake);const command={channel:'email' as const,address:'a@example.com',content:'Hi',idempotencyKey:'one'};await expect(registry.send(command)).rejects.toThrow('Fake transient');await expect(registry.send(command)).resolves.toEqual({providerMessageId:'fake-1'});expect(fake.sent).toHaveLength(1)});
});
