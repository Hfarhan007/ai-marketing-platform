import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  AiProvider,
  AiProviderError,
  AiResponse,
  AiRequest,
} from '../providers/ai-provider.interface.js';
@Injectable()
export class FallbackPolicyService {
  async execute(
    providers: readonly AiProvider[],
    request: AiRequest,
    retries = 2,
  ): Promise<{ response: AiResponse; provider: AiProvider; retries: number; fallbackUsed: boolean }> {
    const errors: string[] = [];
    let attempts = 0;
    for (const [providerIndex, provider] of providers.entries()) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return { response: await provider.chat(request), provider, retries: attempts, fallbackUsed: providerIndex > 0 };
        } catch (error) {
          attempts++;
          errors.push(`${provider.name}:${error instanceof Error ? error.message : 'failed'}`);
          if (!(error as AiProviderError).retryable) break;
          if (attempt < retries)
            await new Promise((resolve) => setTimeout(resolve, Math.min(1000, 100 * 2 ** attempt)));
        }
      }
    }
    throw new ServiceUnavailableException(`All AI providers failed: ${errors.join('; ')}`);
  }
}
