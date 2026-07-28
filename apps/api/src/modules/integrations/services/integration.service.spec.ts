import { createHmac } from 'node:crypto';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { SignedFixtureProviderAdapter } from '../providers/provider.registry.js';
import { IntegrationService } from './integration.service.js';
describe('IntegrationService webhooks',()=>{
 it('acknowledges duplicate signed events without queueing twice',async()=>{const workspaceId=new Types.ObjectId().toHexString(),connectionId=new Types.ObjectId().toHexString(),body=Buffer.from(JSON.stringify({id:'evt_fixture',type:'order.created'})),timestamp=String(Math.floor(Date.now()/1000)),secret='fixture-secret',signature=createHmac('sha256',secret).update(`${timestamp}.`).update(body).digest('hex'),adapter=new SignedFixtureProviderAdapter('shopify');const repository={connection:vi.fn().mockResolvedValue({provider:'shopify'}),credential:vi.fn().mockResolvedValue({encryptedPayload:'sealed'}),reserveWebhook:vi.fn().mockResolvedValue({event:{_id:new Types.ObjectId()},duplicate:true})};const service=new IntegrationService(repository as never,{get:()=>adapter}as never,{open:()=>({webhookSecret:secret})}as never,{}as never,{add:vi.fn()}as never);await expect(service.webhook(workspaceId,connectionId,body,{'x-webhook-timestamp':timestamp,'x-webhook-signature':signature})).resolves.toEqual({accepted:true,duplicate:true})});
});
