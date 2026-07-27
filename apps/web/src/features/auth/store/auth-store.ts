import { create } from 'zustand';
import type { Role } from '@/app/config/permissions.config';
import { roles } from '@/app/config/permissions.config';
import type { PlanId } from '@/app/config/plans.config';

export interface MockUser {
  displayName: string;
  email: string;
  id: string;
  plan: PlanId;
  role: Role;
}

interface AuthState {
  error: string | null;
  isLoading: boolean;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  signIn: (remember?: boolean, email?: string) => void;
  setSession: (user: MockUser, remember?: boolean) => void;
  signOut: () => void;
  user: MockUser | null;
}

const storageKey = 'marketflow-mock-session';
function isMockUser(value: unknown): value is MockUser {
  if (typeof value !== 'object' || value === null) return false;
  return 'displayName' in value
    && typeof value.displayName === 'string'
    && value.displayName.length > 0
    && 'email' in value
    && typeof value.email === 'string'
    && value.email.includes('@')
    && 'id' in value
    && typeof value.id === 'string'
    && value.id.length > 0
    && 'role' in value
    && typeof value.role === 'string'
    && roles.some((role) => role === value.role)
    && 'plan' in value
    && (value.plan === 'free' || value.plan === 'pro' || value.plan === 'enterprise');
}

function getStoredUser(): MockUser | null {
  const raw = localStorage.getItem(storageKey) ?? sessionStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isMockUser(parsed)) return parsed;
    throw new Error('Stored mock session is invalid.');
  } catch {
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  error: null,
  isLoading: false,
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  setSession: (user, remember = false) => {
    const target = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    target.setItem(storageKey, JSON.stringify(user));
    other.removeItem(storageKey);
    set({ error: null, isLoading: false, user });
  },
  signIn: (remember = false, email = 'demo@example.com') => {
    const user: MockUser = {
      displayName: email.split('@')[0] || 'Demo User',
      email,
      id: 'local-demo-user',
      plan: 'enterprise',
      role: 'owner',
    };
    const target = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    target.setItem(storageKey, JSON.stringify(user));
    other.removeItem(storageKey);
    set({ error: null, isLoading: false, user });
  },
  signOut: () => {
    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(storageKey);
    set({ error: null, user: null });
  },
  user: getStoredUser(),
}));
