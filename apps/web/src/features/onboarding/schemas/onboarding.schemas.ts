import { z } from 'zod';

const emailList = z.string().trim().refine((value) => !value || value.split(/[\n,]/).map((email) => email.trim()).filter(Boolean).every((email) => z.email().safeParse(email).success), 'Enter valid email addresses separated by commas or new lines.');

export const onboardingSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i, 'Choose a valid brand color.'),
  businessType: z.string().min(1, 'Choose a business type.'),
  channels: z.array(z.string()).min(1, 'Choose at least one channel.'),
  companySize: z.string().min(1, 'Choose a company size.'),
  currency: z.string().length(3, 'Choose a currency.'),
  goals: z.array(z.string()).min(1, 'Choose at least one goal.').max(4, 'Choose no more than four goals.'),
  industry: z.string().min(1, 'Choose an industry.'),
  locale: z.enum(['en', 'ur', 'ar']),
  logoName: z.string(),
  teamEmails: emailList,
  timezone: z.string().min(1, 'Choose a timezone.'),
  workspaceName: z.string().trim().min(2, 'Use at least 2 characters.').max(60),
  workspaceSlug: z.string().trim().min(2).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.'),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;
export const workspaceSchema = onboardingSchema.pick({ workspaceName: true, workspaceSlug: true });
export const industrySchema = onboardingSchema.pick({ industry: true });
export const goalsSchema = onboardingSchema.pick({ goals: true });
export const channelsSchema = onboardingSchema.pick({ channels: true });
export const teamSchema = z.object({ emails: emailList });
export type WorkspaceValues = z.infer<typeof workspaceSchema>;
export type IndustryValues = z.infer<typeof industrySchema>;
export type GoalsValues = z.infer<typeof goalsSchema>;
export type ChannelsValues = z.infer<typeof channelsSchema>;
export type TeamValues = z.infer<typeof teamSchema>;
