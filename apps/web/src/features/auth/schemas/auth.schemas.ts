import { z } from 'zod';

const password = z.string().min(8, 'Use at least 8 characters.').regex(/[A-Z]/, 'Include an uppercase letter.').regex(/[a-z]/, 'Include a lowercase letter.').regex(/\d/, 'Include a number.');

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  remember: z.boolean(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: z.string().trim().email('Enter a valid email address.'),
  password,
  confirmPassword: z.string(),
  terms: z.boolean().refine(Boolean, 'Accept the terms to continue.'),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

export const twoFactorSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
});

export const resetPasswordSchema = z.object({
  password,
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

export const inviteSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.'),
  password,
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });

export const recoveryCodeSchema = z.object({
  code: z.string().trim().min(8, 'Enter a valid recovery code.'),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type TwoFactorValues = z.infer<typeof twoFactorSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type InviteValues = z.infer<typeof inviteSchema>;
export type RecoveryCodeValues = z.infer<typeof recoveryCodeSchema>;
