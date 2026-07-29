import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider.js';
@Injectable()
export class OpenRouterProvider extends OpenAiProvider {
  constructor(config: ConfigService) {
    super(config, {
      name: 'openrouter',
      apiKeyConfig: 'ai.openrouterApiKey',
      baseUrlConfig: 'ai.openrouterBaseUrl',
      defaultBaseUrl: 'https://openrouter.ai/api/v1',
    });
  }
}
