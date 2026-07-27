import { DEFAULT_API_URL } from '@repo/config';
import { z } from 'zod';

const environmentSchema = z.object({
  MODE: z.enum(['development', 'production', 'test']).catch('development'),
  VITE_API_URL: z.string().url().default(DEFAULT_API_URL),
});

export const environment = environmentSchema.parse({
  MODE: import.meta.env.MODE,
  VITE_API_URL: import.meta.env.VITE_API_URL,
});
