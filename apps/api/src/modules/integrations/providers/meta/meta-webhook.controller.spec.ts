import { describe,expect,it,vi } from 'vitest';
import { MetaWebhookController } from './meta-webhook.controller.js';

describe('MetaWebhookController',()=>{
 const reply=()=>({code:vi.fn().mockReturnThis(),send:vi.fn()});
 it('completes the configured webhook verification handshake',()=>{const response=reply(),controller=new MetaWebhookController({get:()=> 'verify-me'} as never,{} as never);controller.verify('workspace','connection','subscribe','verify-me','challenge-123',response);expect(response.code).toHaveBeenCalledWith(200);expect(response.send).toHaveBeenCalledWith('challenge-123');});
 it('rejects an incorrect verification token without a development bypass',()=>{const response=reply(),controller=new MetaWebhookController({get:()=> 'verify-me'} as never,{} as never);controller.verify('workspace','connection','subscribe','wrong','challenge',response);expect(response.code).toHaveBeenCalledWith(403);expect(response.send).toHaveBeenCalledWith('Forbidden');});
 it('forwards the exact raw body and signature headers for enforcement',async()=>{const webhook=vi.fn().mockResolvedValue({accepted:true}),controller=new MetaWebhookController({get:vi.fn()} as never,{webhook} as never),body=Buffer.from('{"entry":[]}');await controller.receive('workspace','connection',{rawBody:body,headers:{'x-hub-signature-256':'sha256=abc'}});expect(webhook).toHaveBeenCalledWith('workspace','connection',body,{'x-hub-signature-256':'sha256=abc'});});
});
