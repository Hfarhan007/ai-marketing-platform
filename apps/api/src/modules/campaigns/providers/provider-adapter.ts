import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  CampaignChannel,
  ProviderDeliveryCommand,
  ProviderDeliveryResult,
} from '../types/campaign.types.js';
import { CircuitBreaker } from '../../../resilience/resilience.js';
export interface CampaignProviderAdapter {
  send(command: ProviderDeliveryCommand): Promise<ProviderDeliveryResult>;
}
export const CAMPAIGN_PROVIDER_ADAPTERS = Symbol('CAMPAIGN_PROVIDER_ADAPTERS');
@Injectable()
export class ProviderAdapterRegistry {
  private readonly adapters = new Map<CampaignChannel, CampaignProviderAdapter>();
  private readonly breakers = new Map<CampaignChannel, CircuitBreaker>();
  register(channel: CampaignChannel, adapter: CampaignProviderAdapter) {
    this.adapters.set(channel, adapter);
    this.breakers.set(channel, new CircuitBreaker(5, 30_000, 10_000));
  }
  send(command: ProviderDeliveryCommand) {
    const adapter = this.adapters.get(command.channel);
    if (!adapter)
      throw new ServiceUnavailableException(`No ${command.channel} provider adapter is configured`);
    const breaker = this.breakers.get(command.channel);
    if (!breaker) throw new ServiceUnavailableException('Provider circuit is unavailable');
    return breaker.execute(() => adapter.send(command));
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
