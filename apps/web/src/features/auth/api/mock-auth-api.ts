import { mockDelay } from '@/shared/lib/retry';
import type { MockUser } from '../store/auth-store';

export interface AuthCredentials {
  email: string;
  password: string;
  remember: boolean;
}

export interface RegistrationRequest extends AuthCredentials {
  name: string;
}

export interface AuthResult {
  requiresTwoFactor: boolean;
  user: MockUser;
}

export class MockAuthError extends Error {
  constructor(message: string, readonly code: 'ACCOUNT_LOCKED' | 'INVALID_CREDENTIALS' | 'EMAIL_TAKEN' | 'INVALID_CODE') {
    super(message);
    this.name = 'MockAuthError';
  }
}

function userFor(email: string, displayName?: string): MockUser {
  return {
    displayName: displayName ?? email.split('@')[0] ?? 'Demo User',
    email,
    id: `local-${email.toLowerCase().replaceAll(/[^a-z0-9]/g, '-')}`,
    plan: 'enterprise',
    role: 'owner',
  };
}

export const mockAuthApi = {
  async login(input: AuthCredentials, signal?: AbortSignal): Promise<AuthResult> {
    await mockDelay(350, signal);
    if (input.email.toLowerCase() === 'locked@example.com') throw new MockAuthError('This account is temporarily locked.', 'ACCOUNT_LOCKED');
    if (input.email.toLowerCase() === 'error@example.com') throw new MockAuthError('The email or password is incorrect.', 'INVALID_CREDENTIALS');
    return { requiresTwoFactor: input.email.toLowerCase().startsWith('2fa'), user: userFor(input.email) };
  },
  async register(input: RegistrationRequest, signal?: AbortSignal): Promise<AuthResult> {
    await mockDelay(400, signal);
    if (input.email.toLowerCase() === 'existing@example.com') throw new MockAuthError('An account already exists for this email.', 'EMAIL_TAKEN');
    return { requiresTwoFactor: false, user: userFor(input.email, input.name) };
  },
  async requestPasswordReset(email: string, signal?: AbortSignal) {
    await mockDelay(300, signal);
    return { email };
  },
  async resetPassword(token: string, password: string, signal?: AbortSignal) {
    await mockDelay(350, signal);
    if (!token || password.length < 8) throw new MockAuthError('The reset link is invalid or expired.', 'INVALID_CODE');
    return { success: true as const };
  },
  async verifyTwoFactor(code: string, signal?: AbortSignal) {
    await mockDelay(250, signal);
    if (code !== '123456' && code !== 'RECOVERY-2026') throw new MockAuthError('The verification code is invalid.', 'INVALID_CODE');
    return { success: true as const };
  },
  async acceptInvite(token: string, name: string, password: string, signal?: AbortSignal) {
    await mockDelay(350, signal);
    if (!token || !name || !password) throw new MockAuthError('This invitation is invalid or expired.', 'INVALID_CODE');
    return { user: userFor('invitee@example.com', name) };
  },
};
