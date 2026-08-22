import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PROVIDERS, type IntegrationProviderAdapter, type Provider, type ProviderConnectionContext, type ProviderCredentials, type ProviderHealth, type SyncRequest, type SyncResult, type WebhookEnvelope } from '../types/provider-adapter.js';
import { HighLevelProviderAdapter } from './highlevel/highlevel.provider.js';
import { FacebookMetaProviderAdapter, InstagramMetaProviderAdapter } from './meta/meta.provider.js';

export class UnsupportedProviderAdapter implements IntegrationProviderAdapter {
  constructor(readonly provider: Provider) {}
  connect(): Promise<ProviderCredentials> { return Promise.reject(this.unavailable('OAuth adapter')); }
  disconnect(): Promise<void> { return Promise.resolve(); }
  refreshCredentials(): Promise<ProviderCredentials> { return Promise.reject(this.unavailable('credential refresh')); }
  validateConnection(): Promise<boolean> { return Promise.resolve(false); }
  sync(...args: [ProviderConnectionContext, SyncRequest]): Promise<SyncResult> { void args; return Promise.reject(this.unavailable('sync adapter')); }
  subscribeWebhooks(): Promise<void> { return Promise.reject(this.unavailable('webhook subscription')); }
  handleWebhook(rawBody: Buffer, headers: Record<string, string | undefined>): Promise<WebhookEnvelope> {
    const timestamp = new Date(Number(headers['x-webhook-timestamp']) * 1000);
    const payload = JSON.parse(rawBody.toString('utf8')) as unknown;
    if (typeof payload !== 'object' || payload === null) throw new Error('Invalid webhook payload');
    const record = payload as Record<string, unknown>;
    return Promise.resolve({ eventId: typeof record.id === 'string' ? record.id : (headers['x-event-id'] ?? ''), eventType: typeof record.type === 'string' ? record.type : 'unknown', timestamp, payload: record });
  }
  verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>, secret: string, toleranceSeconds: number) {
    const timestamp = headers['x-webhook-timestamp'] ?? '';
    const signature = (headers['x-webhook-signature'] ?? '').replace(/^sha256=/u, '');
    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > toleranceSeconds) return false;
    const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
    const left = Buffer.from(signature), right = Buffer.from(expected);
    return left.length === right.length && timingSafeEqual(left, right);
  }
  healthCheck(): Promise<ProviderHealth> { return Promise.resolve({ healthy: false, message: `${this.provider} provider is not implemented`, checkedAt: new Date() }); }
  private unavailable(capability: string) { return new ServiceUnavailableException(`${this.provider} ${capability} is not configured`); }
}

@Injectable()
export class ProviderRegistry {
  private readonly adapters: ReadonlyMap<Provider, IntegrationProviderAdapter>;
  constructor(facebook: FacebookMetaProviderAdapter, instagram: InstagramMetaProviderAdapter, highlevel: HighLevelProviderAdapter) {
    const implemented = new Map<Provider, IntegrationProviderAdapter>([['facebook', facebook], ['instagram', instagram], ['highlevel', highlevel]]);
    this.adapters = new Map(PROVIDERS.map((provider) => [provider, implemented.get(provider) ?? new UnsupportedProviderAdapter(provider)]));
  }
  get(provider: Provider): IntegrationProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new ServiceUnavailableException(`Unsupported provider ${provider}`);
    return adapter;
  }
}

export class SignedFixtureProviderAdapter extends UnsupportedProviderAdapter {
  constructor(provider: Provider = 'stripe') { super(provider); }
  override connect(input: Record<string, string> = {}) { return Promise.resolve({ ...('accessToken' in input ? { accessToken: input.accessToken } : {}), ...('refreshToken' in input ? { refreshToken: input.refreshToken } : {}), ...('webhookSecret' in input ? { webhookSecret: input.webhookSecret } : {}) }); }
  override validateConnection() { return Promise.resolve(true); }
  override healthCheck() { return Promise.resolve({ healthy: true, checkedAt: new Date() }); }
}
