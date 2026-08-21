import { z } from 'zod';

export const LEAD_QUALIFICATION_PROMPT_VERSION = 'lead-qualification.v1';
export const leadQualificationContract = z.object({
  score: z.number().int().min(0).max(100),
  qualification: z.enum(['unqualified', 'marketing_qualified', 'sales_qualified', 'disqualified']),
  intent: z.enum(['buying', 'researching', 'support', 'partnership', 'unknown']),
  summary: z.string().trim().min(1).max(1_000),
  recommendedAction: z.string().trim().min(1).max(500),
  suggestedReply: z.string().trim().min(1).max(2_000),
  confidence: z.number().min(0).max(1),
}).strict();
export type LeadQualificationOutput = z.infer<typeof leadQualificationContract>;

export const LEAD_QUALIFICATION_SYSTEM_PROMPT = `You qualify inbound leads. Return only JSON matching the supplied schema. Base every field only on the supplied lead text. Do not infer sensitive traits. A low-evidence lead must have low confidence. Never execute actions or call tools.`;
