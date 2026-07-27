import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { useAuthStore } from './store/auth-store';

function renderFlow(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={page} /><Route path="/register" element={page} /><Route path="/onboarding" element={<h1>Onboarding destination</h1>} /><Route path="/app/demo-workspace/dashboard" element={<h1>Dashboard destination</h1>} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe('authentication flows', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({ error: null, isLoading: false, user: null });
  });

  it('logs in, persists the remembered session, and redirects', async () => {
    const user = userEvent.setup();
    renderFlow(<LoginPage />);
    await user.type(screen.getByLabelText('Email address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secure123');
    await user.click(screen.getByLabelText('Remember me'));
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard destination' })).toBeInTheDocument();
    expect(localStorage.getItem('marketflow-mock-session')).toContain('owner@example.com');
  });

  it('registers a validated account and starts onboarding', async () => {
    const user = userEvent.setup();
    renderFlow(<RegisterPage />);
    await user.type(screen.getByLabelText('Full name'), 'Amina Khan');
    await user.type(screen.getByLabelText('Email address'), 'amina@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secure123!');
    await user.type(screen.getByLabelText('Confirm password'), 'Secure123!');
    await user.click(screen.getByRole('checkbox', { name: /I accept the terms/ }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: 'Onboarding destination' })).toBeInTheDocument();
    expect(sessionStorage.getItem('marketflow-mock-session')).toContain('amina@example.com');
  });
});
