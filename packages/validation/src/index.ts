import { z } from 'zod';

export const campaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  status: z.enum(['draft', 'active', 'paused', 'complete']),
});

export const contactPointSchema = z.object({
  value: z.string().trim().min(1).max(254),
  label: z.string().trim().min(1).max(30).default('other'),
  primary: z.boolean().default(false),
});

export const contactInputSchema = z
  .object({
    firstName: z.string().trim().max(100).default(''),
    lastName: z.string().trim().max(100).default(''),
    displayName: z.string().trim().min(1).max(200),
    emailAddresses: z.array(contactPointSchema).max(20).default([]),
    phoneNumbers: z.array(contactPointSchema).max(20).default([]),
    addresses: z.array(z.record(z.string(), z.string())).max(20).default([]),
    tags: z.array(z.string().trim().min(1).max(50)).max(50).default([]),
    customFields: z.record(z.string(), z.unknown()).default({}),
    source: z.string().trim().min(1).max(100).default('manual'),
    ownerId: z.string().regex(/^[a-f\d]{24}$/iu).optional(),
    companyIds: z.array(z.string().regex(/^[a-f\d]{24}$/iu)).max(100).default([]),
    communicationPreferences: z.record(z.string(), z.boolean()).default({}),
    consentSummary: z.record(z.string(), z.union([z.string(), z.boolean()])).default({}),
    lifecycleStatus: z.string().trim().min(1).max(50).default('subscriber'),
  })
  .refine((value) => value.emailAddresses.length > 0 || value.phoneNumbers.length > 0, {
    message: 'At least one email address or phone number is required.',
    path: ['emailAddresses'],
  });

export const contactUpdateInputSchema = contactInputSchema.and(
  z.object({ version: z.number().int().min(0) }),
);
