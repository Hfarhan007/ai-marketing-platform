import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './auth-context';

function AuthProbe() {
  const { isAuthenticated, signIn, signOut, user } = useAuth();
  return <div><span>{isAuthenticated ? user?.email : 'signed-out'}</span><button onClick={() => signIn(true, 'owner@example.com')} type="button">Sign in</button><button onClick={signOut} type="button">Sign out</button></div>;
}

describe('AuthProvider', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({ error: null, isLoading: false, user: null });
  });

  it('exposes the mock authentication session', () => {
    render(<AuthProvider><AuthProbe /></AuthProvider>);
    expect(screen.getByText('signed-out')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'Sign in' }).click());
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(localStorage.getItem('marketflow-mock-session')).toContain('owner@example.com');
    act(() => screen.getByRole('button', { name: 'Sign out' }).click());
    expect(screen.getByText('signed-out')).toBeInTheDocument();
  });
});
