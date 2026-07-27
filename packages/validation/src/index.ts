import { z } from 'zod';

export const campaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  status: z.enum(['draft', 'active', 'paused', 'complete']),
});
