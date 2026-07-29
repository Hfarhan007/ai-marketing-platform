import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider.js';
@Injectable()
export class GroqProvider extends OpenAiProvider {
  constructor(config: ConfigService) {
    super(config, {
      name: 'groq',
      apiKeyConfig: 'ai.groqApiKey',
      baseUrlConfig: 'ai.groqBaseUrl',
      defaultBaseUrl: 'https://api.groq.com/openai/v1',
    });
  }
}
