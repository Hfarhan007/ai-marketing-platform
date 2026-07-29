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
}
@Injectable()
export class CapabilityRegistry {
  private readonly models = new Map<string, ModelCapability>();
  constructor() {
    for (const v of [
      {
        provider: 'openai',
        model: 'gpt-4.1-mini',
        capabilities: ['chat', 'json', 'streaming', 'tools'],
        contextTokens: 1_000_000,
        maxOutputTokens: 32_768,
        inputCostPerMillion: 0.4,
        outputCostPerMillion: 1.6,
      },
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        capabilities: ['chat', 'json', 'embeddings', 'streaming', 'tools'],
        contextTokens: 1_000_000,
        maxOutputTokens: 65_536,
        inputCostPerMillion: 0.3,
        outputCostPerMillion: 2.5,
      },
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        capabilities: ['chat', 'json', 'streaming', 'tools'],
        contextTokens: 128_000,
        maxOutputTokens: 32_768,
        inputCostPerMillion: 0.59,
        outputCostPerMillion: 0.79,
      },
      {
        provider: 'openrouter',
        model: 'openai/gpt-4.1-mini',
        capabilities: ['chat', 'json', 'streaming', 'tools'],
        contextTokens: 1_000_000,
        maxOutputTokens: 32_768,
        inputCostPerMillion: 0.4,
        outputCostPerMillion: 1.6,
      },
      {
        provider: 'ollama',
        model: 'llama3.2',
        capabilities: ['chat', 'json', 'streaming', 'tools'],
        contextTokens: 128_000,
        maxOutputTokens: 8_192,
        inputCostPerMillion: 0,
        outputCostPerMillion: 0,
      },
      {
        provider: 'openai',
        model: 'text-embedding-3-small',
        capabilities: ['embeddings'],
        contextTokens: 8_191,
        maxOutputTokens: 0,
        inputCostPerMillion: 0.02,
        outputCostPerMillion: 0,
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
