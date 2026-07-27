import { type ReactNode, useMemo } from 'react';
import { useAuthStore } from '@/features/auth';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);
  const value = useMemo(
    () => ({ isAuthenticated: user !== null, isLoading, signIn, signOut, user }),
    [isLoading, signIn, signOut, user],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
