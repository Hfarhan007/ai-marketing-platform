import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  IntegrationProviderAdapter,
  Provider,
  ProviderConnectionContext,
  ProviderCredentials,
  ProviderHealth,
  ProviderResourceSelection,
  SyncRequest,
  SyncResult,
  WebhookEnvelope,
} from '../../types/provider-adapter.js';
import { MetaApiClient } from './meta-api.client.js';
import { MetaOAuthService } from './meta-oauth.service.js';
import { MetaResourcesService } from './meta-resources.service.js';
import { MetaAdsService } from './meta-ads.service.js';
import { MetaInsightsService } from './meta-insights.service.js';
import { metaLeadgenChange, metaLeadgenChanges } from './meta-mappers.js';
import type { MetaWebhookPayload } from './meta.types.js';

abstract class MetaProviderAdapter implements IntegrationProviderAdapter {
  abstract readonly provider: Provider;
  constructor(
    protected readonly client: MetaApiClient,
    protected readonly config: ConfigService,
    protected readonly oauth: MetaOAuthService,
    protected readonly resources: MetaResourcesService,
    protected readonly ads: MetaAdsService,
    protected readonly insights: MetaInsightsService,
  ) {}
  authorizationUrl(input: { state: string; redirectUri: string }) {
    return this.oauth.authorizationUrl(this.provider, input.state, input.redirectUri);
  }
  async connect(input: Record<string, string>): Promise<ProviderCredentials> {
    return this.oauth.exchange(input.code ?? '', input.redirectUri ?? this.required('redirectUri'));
  }
  disconnect(): Promise<void> {
    return Promise.resolve();
  }
  refreshCredentials(context: ProviderConnectionContext) {
    return this.oauth.refresh(context.credentials);
  }
  async validateConnection(context: ProviderConnectionContext) {
    if (!context.credentials.accessToken) return false;
    await this.oauth.validate(context.credentials.accessToken);
    return true;
  }
  discoverResources(context: ProviderConnectionContext) {
    return this.resources.discover(context);
  }
  selectResources(context: ProviderConnectionContext, selection: ProviderResourceSelection) {
    return this.resources.select(context, selection);
  }
  async sync(context: ProviderConnectionContext, request: SyncRequest): Promise<SyncResult> {
    if (request.resource === 'insights') return this.insights.sync(context, request);
    return this.ads.sync(context, request);
  }
  async subscribeWebhooks(context: ProviderConnectionContext) {
    const pageIds =
      context.credentials.selectedResourceIds?.pages ??
      (context.credentials.accountId ? [context.credentials.accountId] : []);
    if (pageIds.length === 0)
      throw new ServiceUnavailableException('Select at least one Facebook Page before subscribing');
    for (const pageId of pageIds)
      await this.client.request(
        `${pageId}/subscribed_apps?subscribed_fields=leadgen`,
        context.credentials.resourceTokens?.[pageId] ?? this.token(context),
        { method: 'POST' },
      );
  }
  handleWebhook(rawBody: Buffer): Promise<WebhookEnvelope> {
    const payload = this.payload(rawBody),
      change = metaLeadgenChange(payload);
    if (!change)
      throw new BadRequestException({
        code: 'META_WEBHOOK_NO_LEADGEN',
        message: 'Meta webhook contains no leadgen event',
        retryable: false,
      });
    return Promise.resolve({
      eventId: change.leadgenId,
      eventType: 'leadgen',
      timestamp: change.createdAt,
      payload: payload as Record<string, unknown>,
    });
  }
  handleWebhooks(rawBody: Buffer): Promise<WebhookEnvelope[]> {
    const payload = this.payload(rawBody),
      changes = metaLeadgenChanges(payload);
    if (changes.length === 0)
      throw new BadRequestException({
        code: 'META_WEBHOOK_NO_LEADGEN',
        message: 'Meta webhook contains no leadgen event',
        retryable: false,
      });
    return Promise.resolve(changes.map((change) => ({
      eventId: change.leadgenId,
      eventType: 'leadgen',
      timestamp: change.createdAt,
      payload: {
        ...(payload as Record<string, unknown>),
        _normalizedLeadgen: {
          leadgenId: change.leadgenId,
          pageId: change.pageId,
          formId: change.formId,
          createdAt: change.createdAt.toISOString(),
        },
      },
    })));
  }
  verifyWebhook(rawBody: Buffer, headers: Record<string, string | undefined>, secret: string) {
    const supplied = (headers['x-hub-signature-256'] ?? '').replace(/^sha256=/u, '');
    if (!/^[a-f\d]{64}$/iu.test(supplied)) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex'),
      left = Buffer.from(supplied, 'hex'),
      right = Buffer.from(expected, 'hex');
    return left.length === right.length && timingSafeEqual(left, right);
  }
  async healthCheck(context: ProviderConnectionContext): Promise<ProviderHealth> {
    try {
      return { healthy: await this.validateConnection(context), checkedAt: new Date() };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Meta unavailable',
        checkedAt: new Date(),
      };
    }
  }
  private token(context: ProviderConnectionContext) {
    if (!context.credentials.accessToken)
      throw new ServiceUnavailableException('Meta access token is unavailable');
    return context.credentials.accessToken;
  }
  private payload(rawBody: Buffer) {
    try {
      const value = JSON.parse(rawBody.toString('utf8')) as unknown;
      if (typeof value !== 'object' || value === null || Array.isArray(value))
        throw new Error('shape');
      return value as MetaWebhookPayload;
    } catch {
      throw new BadRequestException({
        code: 'META_WEBHOOK_MALFORMED',
        message: 'Malformed Meta webhook payload',
        retryable: false,
      });
    }
  }
  private required(key: string) {
    const value = this.config.get<string>(`integrations.meta.${key}`);
    if (!value) throw new ServiceUnavailableException(`Meta ${key} is not configured`);
    return value;
  }
}

@Injectable()
export class FacebookMetaProviderAdapter extends MetaProviderAdapter {
  readonly provider = 'facebook' as const;
}
@Injectable()
export class InstagramMetaProviderAdapter extends MetaProviderAdapter {
  readonly provider = 'instagram' as const;
}
