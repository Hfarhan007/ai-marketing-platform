import { registerAs } from '@nestjs/config';
export const aiConfig = registerAs('ai', () => {
  const provider = process.env.AI_PROVIDER ?? 'disabled';
  const allowedProviders = (process.env.AI_ALLOWED_PROVIDERS ?? provider).split(',').filter(Boolean);
  if (process.env.NODE_ENV === 'development' && provider !== 'disabled') allowedProviders.push('mock');
  return {
    provider,
    allowedProviders: [...new Set(allowedProviders)],
    timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 30_000),
    monthlyTokenQuota: Number(process.env.AI_MONTHLY_TOKEN_QUOTA ?? 1_000_000),
    monthlyCostQuotaUsd: Number(process.env.AI_MONTHLY_COST_QUOTA_USD ?? 100),
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiBaseUrl: process.env.GEMINI_BASE_URL,
    groqApiKey: process.env.GROQ_API_KEY,
    groqBaseUrl: process.env.GROQ_BASE_URL,
    openrouterApiKey: process.env.OPENROUTER_API_KEY,
    openrouterBaseUrl: process.env.OPENROUTER_BASE_URL,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
    developmentMockFallback: process.env.NODE_ENV === 'development',
  };
});
