import type { ReactElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { useAuthStore, type MockUser } from '@/features/auth';
import { workspacePath } from '@/shared/constants/routes';
import { FeatureFlagRoute } from './feature-flag-route';
import { GuestRoute } from './guest-route';
import { PermissionRoute } from './permission-route';
import { ProtectedRoute } from './protected-route';

function LocationProbe() {
  const location = useLocation();
  return <span>{`${location.pathname}${location.search}`}</span>;
}

function renderAccessRoutes(initialEntry: string, route: ReactElement, gatedPath = '/private') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={route}>
            <Route path={gatedPath} element={<span>Private</span>} />
          </Route>
          {gatedPath === '/login' ? null : <Route path="/login" element={<LocationProbe />} />}
          <Route path="/app/demo-workspace/dashboard" element={<span>Dashboard</span>} />
          <Route path="/unauthorized" element={<span>Unauthorized</span>} />
          <Route path="/not-found" element={<span>Not found</span>} />
          <Route path="*" element={<span>Unknown route</span>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

const owner: MockUser = {
  displayName: 'Owner',
  email: 'owner@example.com',
  id: 'owner-1',
  plan: 'enterprise',
  role: 'owner',
};

describe('router access controls', () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useAuthStore.setState({ error: null, isLoading: false, user: null });
  });

  it('preserves the requested URL when a protected route redirects', () => {
    renderAccessRoutes('/private?tab=activity', <ProtectedRoute />);
    expect(screen.getByText('/login?returnUrl=%2Fprivate%3Ftab%3Dactivity')).toBeInTheDocument();
  });

  it('redirects an authenticated visitor away from guest-only routes', () => {
    useAuthStore.setState({ user: owner });
    renderAccessRoutes('/login', <GuestRoute />, '/login');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('denies a role without the required permission', () => {
    useAuthStore.setState({ user: { ...owner, role: 'viewer' } });
    renderAccessRoutes('/private', <PermissionRoute permission="settings:manage" />);
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
  });

  it('hides a disabled feature behind the not-found route', () => {
    renderAccessRoutes('/private', <FeatureFlagRoute flag="aiAgents" />);
    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  it('uses the unknown route fallback', () => {
    renderAccessRoutes('/does-not-exist', <ProtectedRoute />);
    expect(screen.getByText('Unknown route')).toBeInTheDocument();
  });
});

describe('workspace route generation', () => {
  it('encodes workspace identifiers and normalizes route segments', () => {
    expect(workspacePath('North America', '/contacts')).toBe('/app/North%20America/contacts');
  });
});
