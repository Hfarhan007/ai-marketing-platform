import { z } from 'zod';

export const contactSchema = z.object({
  firstName: z.string().trim().min(2, 'First name must contain at least 2 characters.'),
  lastName: z.string().trim().min(2, 'Last name must contain at least 2 characters.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().min(7, 'Enter a valid phone number.'),
  company: z.string().trim().min(2, 'Company is required.'),
  jobTitle: z.string().trim().min(2, 'Job title is required.'),
  status: z.enum(['customer', 'lead', 'qualified', 'inactive']),
  leadSource: z.string().min(1, 'Choose a lead source.'),
  assignee: z.string().min(1, 'Choose an assignee.'),
  location: z.string().trim().min(2, 'Location is required.'),
  tagsText: z.string(),
  consentStatus: z.enum(['granted', 'pending', 'revoked']),
  emailPreference: z.boolean(),
  phonePreference: z.boolean(),
  smsPreference: z.boolean(),
  customerTier: z.string(),
  annualValue: z.string(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
