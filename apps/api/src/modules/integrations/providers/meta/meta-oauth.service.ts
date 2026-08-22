import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Provider, ProviderCredentials } from '../../types/provider-adapter.js';
import { META_OAUTH_SCOPES, META_TOKEN_EXPIRY_SKEW_MS } from './meta.constants.js';
import { MetaOAuthException } from './meta.errors.js';
import { MetaApiClient } from './meta-api.client.js';

interface TokenResponse { access_token?: string; expires_in?: number; token_type?: string }
interface DebugTokenResponse { data?: { app_id?: string; user_id?: string; is_valid?: boolean; expires_at?: number; scopes?: string[] } }

@Injectable()
export class MetaOAuthService {
  constructor(private readonly client: MetaApiClient, private readonly config: ConfigService) {}

  authorizationUrl(provider: Provider, state: string, redirectUri: string) {
    const appId = this.required('appId');
    const configuredRedirect = this.required('redirectUri');
    if (redirectUri !== configuredRedirect) throw new MetaOAuthException('META_REDIRECT_URI_MISMATCH', 'OAuth redirect URI does not match the configured Meta redirect URI', false);
    const scopes = provider === 'instagram' ? META_OAUTH_SCOPES.instagram : META_OAUTH_SCOPES.facebook;
    const version = this.config.get<string>('integrations.meta.graphApiVersion') ?? 'v23.0';
    return `https://www.facebook.com/${version}/dialog/oauth?${new URLSearchParams({ client_id: appId, redirect_uri: configuredRedirect, state, response_type: 'code', scope: scopes.join(',') }).toString()}`;
  }

  async exchange(code: string, redirectUri: string): Promise<ProviderCredentials> {
    if (!code) throw new MetaOAuthException('META_AUTHORIZATION_CODE_MISSING', 'Meta authorization code is required', false);
    const appId = this.required('appId'), appSecret = this.required('appSecret');
    try {
      const short = await this.client.request<TokenResponse>(`oauth/access_token?${new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }).toString()}`);
      if (!short.access_token) throw new MetaOAuthException('META_TOKEN_EXCHANGE_FAILED', 'Meta did not return an access token');
      const long = await this.client.request<TokenResponse>(`oauth/access_token?${new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: short.access_token }).toString()}`);
      const accessToken = long.access_token ?? short.access_token;
      const validated = await this.validate(accessToken);
      const expiresAt = validated.expiresAt ?? new Date(Date.now() + (long.expires_in ?? short.expires_in ?? 5_184_000) * 1000);
      return { accessToken, expiresAt: expiresAt.toISOString(), webhookSecret: appSecret };
    } catch (error: unknown) {
      if (error instanceof MetaOAuthException) throw error;
      throw new MetaOAuthException('META_TOKEN_EXCHANGE_FAILED', 'Meta authorization could not be completed; reconnect the integration');
    }
  }

  async refresh(credentials: ProviderCredentials): Promise<ProviderCredentials> {
    if (!credentials.accessToken) throw new MetaOAuthException('META_TOKEN_MISSING', 'Meta access token is unavailable');
    const appId = this.required('appId'), appSecret = this.required('appSecret');
    try {
      const value = await this.client.request<TokenResponse>(`oauth/access_token?${new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: appId, client_secret: appSecret, fb_exchange_token: credentials.accessToken }).toString()}`);
      if (!value.access_token) throw new MetaOAuthException('META_TOKEN_REFRESH_FAILED', 'Meta token extension failed');
      const validated = await this.validate(value.access_token);
      return { ...credentials, accessToken: value.access_token, expiresAt: (validated.expiresAt ?? new Date(Date.now() + (value.expires_in ?? 5_184_000) * 1000)).toISOString() };
    } catch (error: unknown) {
      if (error instanceof MetaOAuthException) throw error;
      throw new MetaOAuthException('META_TOKEN_REFRESH_FAILED', 'Meta credentials could not be extended; reconnect the integration');
    }
  }

  async validate(accessToken: string) {
    const appId = this.required('appId'), appSecret = this.required('appSecret');
    let result: DebugTokenResponse;
    try {
      result = await this.client.request<DebugTokenResponse>(`debug_token?${new URLSearchParams({ input_token: accessToken }).toString()}`, `${appId}|${appSecret}`);
    } catch {
      throw new MetaOAuthException('META_TOKEN_VALIDATION_FAILED', 'Meta credentials could not be validated; reconnect the integration');
    }
    const data = result.data;
    if (!data?.is_valid || data.app_id !== appId) throw new MetaOAuthException('META_TOKEN_INVALID', 'Meta access token is invalid or belongs to another application');
    const expiresAt = data.expires_at ? new Date(data.expires_at * 1000) : undefined;
    if (expiresAt && expiresAt.getTime() <= Date.now() + META_TOKEN_EXPIRY_SKEW_MS) throw new MetaOAuthException('META_TOKEN_EXPIRED', 'Meta access token has expired');
    return { userId: data.user_id, scopes: data.scopes ?? [], expiresAt };
  }

  private required(key: string) {
    const value = this.config.get<string>(`integrations.meta.${key}`);
    if (!value) throw new ServiceUnavailableException(`Meta ${key} is not configured`);
    return value;
  }
}
