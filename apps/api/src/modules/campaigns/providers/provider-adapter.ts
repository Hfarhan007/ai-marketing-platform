import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  CampaignChannel,
  ProviderDeliveryCommand,
  ProviderDeliveryResult,
} from '../types/campaign.types.js';
export interface CampaignProviderAdapter {
  send(command: ProviderDeliveryCommand): Promise<ProviderDeliveryResult>;
}
export const CAMPAIGN_PROVIDER_ADAPTERS = Symbol('CAMPAIGN_PROVIDER_ADAPTERS');
@Injectable()
export class ProviderAdapterRegistry {
  private readonly adapters = new Map<CampaignChannel, CampaignProviderAdapter>();
  register(channel: CampaignChannel, adapter: CampaignProviderAdapter) {
    this.adapters.set(channel, adapter);
  }
  send(command: ProviderDeliveryCommand) {
    const adapter = this.adapters.get(command.channel);
    if (!adapter)
      throw new ServiceUnavailableException(`No ${command.channel} provider adapter is configured`);
    return adapter.send(command);
  }
}
export class FakeProviderAdapter implements CampaignProviderAdapter {
  readonly sent: ProviderDeliveryCommand[] = [];
  failuresRemaining = 0;
  send(command: ProviderDeliveryCommand): Promise<ProviderDeliveryResult> {
    if (this.failuresRemaining-- > 0)
      return Promise.reject(new Error('Fake transient provider failure'));
    this.sent.push(command);
    return Promise.resolve({ providerMessageId: `fake-${this.sent.length}` });
  }
}
