import { Injectable } from '@nestjs/common';
import type { AiCapability, AiProviderName } from '../providers/ai-provider.interface.js';
export interface ModelCapability {
  provider: AiProviderName;
  model: string;
  capabilities: readonly AiCapability[];
  contextTokens: number;
  maxOutputTokens: number;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  latencyClass: 'realtime' | 'standard' | 'batch';
  qualityClass: 'economy' | 'balanced' | 'premium';
  regions: readonly string[];
  privacy: 'local' | 'zero_retention' | 'standard';
  languages: readonly string[];
}
@Injectable()
export class CapabilityRegistry {
  private readonly models = new Map<string, ModelCapability>();
  constructor() {
    for (const v of [
      {
        provider: 'openai',
        model: 'gpt-4.1-mini',
        capabilities: ['chat', 'json', 'vision', 'streaming', 'tools'],
        contextTokens: 1_000_000,
        maxOutputTokens: 32_768,
        inputCostPerMillion: 0.4,
        outputCostPerMillion: 1.6,
        latencyClass: 'standard', qualityClass: 'balanced', regions: ['us', 'eu'], privacy: 'zero_retention', languages: ['*'],
      },
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        capabilities: ['chat', 'json', 'vision', 'embeddings', 'streaming', 'tools'],
        contextTokens: 1_000_000,
        maxOutputTokens: 65_536,
        inputCostPerMillion: 0.3,
        outputCostPerMillion: 2.5,
        latencyClass: 'realtime', qualityClass: 'balanced', regions: ['us', 'eu', 'apac'], privacy: 'standard', languages: ['*'],
      },
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        capabilities: ['chat', 'json', 'streaming', 'tools'],
        contextTokens: 128_000,
        maxOutputTokens: 32_768,
        inputCostPerMillion: 0.59,
        outputCostPerMillion: 0.79,
        latencyClass: 'realtime', qualityClass: 'balanced', regions: ['us'], privacy: 'standard', languages: ['en', 'es', 'fr', 'de'],
      },
      {
        provider: 'openrouter',
        model: 'openai/gpt-4.1-mini',
        capabilities: ['chat', 'json', 'streaming', 'tools'],
        contextTokens: 1_000_000,
        maxOutputTokens: 32_768,
        inputCostPerMillion: 0.4,
        outputCostPerMillion: 1.6,
        latencyClass: 'standard', qualityClass: 'premium', regions: ['us', 'eu'], privacy: 'standard', languages: ['*'],
      },
      {
        provider: 'ollama',
        model: 'llama3.2',
        capabilities: ['chat', 'json', 'streaming', 'tools'],
        contextTokens: 128_000,
        maxOutputTokens: 8_192,
        inputCostPerMillion: 0,
        outputCostPerMillion: 0,
        latencyClass: 'standard', qualityClass: 'economy', regions: ['local'], privacy: 'local', languages: ['*'],
      },
      {
        provider: 'mock',
        model: 'deterministic-mock',
        capabilities: ['chat', 'json', 'streaming'],
        contextTokens: 128_000,
        maxOutputTokens: 8_192,
        inputCostPerMillion: 0,
        outputCostPerMillion: 0,
        latencyClass: 'realtime', qualityClass: 'economy', regions: ['local'], privacy: 'local', languages: ['*'],
      },
      {
        provider: 'openai',
        model: 'text-embedding-3-small',
        capabilities: ['embeddings'],
        contextTokens: 8_191,
        maxOutputTokens: 0,
        inputCostPerMillion: 0.02,
        outputCostPerMillion: 0,
        latencyClass: 'standard', qualityClass: 'balanced', regions: ['us', 'eu'], privacy: 'zero_retention', languages: ['*'],
      },
    ] as ModelCapability[])
      this.models.set(`${v.provider}:${v.model}`, v);
  }
  all() {
    return [...this.models.values()];
  }
  get(provider: AiProviderName, model: string) {
    return this.models.get(`${provider}:${model}`);
  }
  register(v: ModelCapability) {
    this.models.set(`${v.provider}:${v.model}`, v);
  }
}
