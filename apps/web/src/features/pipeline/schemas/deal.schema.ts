import { z } from 'zod';

export const dealSchema = z.object({
  contact: z.string().trim().min(2, 'Contact name is required.'),
  company: z.string().trim().min(2, 'Company is required.'),
  value: z.number().positive('Deal value must be greater than zero.'),
  source: z.string().min(1, 'Choose a source.'),
  assignee: z.string().min(1, 'Choose an owner.'),
  stageId: z.enum(['new-lead', 'contacted', 'qualified', 'meeting-booked', 'proposal-sent', 'negotiation', 'won', 'lost']),
  tagsText: z.string(),
  nextActivity: z.string().trim().min(2, 'Next activity is required.'),
  leadScore: z.number().min(0).max(100),
  expectedCloseDate: z.string().min(1, 'Expected close date is required.'),
  lostReason: z.string(),
});

export type DealFormValues = z.infer<typeof dealSchema>;
