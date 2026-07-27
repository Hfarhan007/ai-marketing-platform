import { Suspense } from 'react';
import { AppErrorBoundary } from '../errors';
import { AppProviders } from './providers';
import { AppRouter, RouteLoadingFallback } from './router';

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <Suspense fallback={<RouteLoadingFallback />}>
          <AppRouter />
        </Suspense>
      </AppProviders>
    </AppErrorBoundary>
  );
}
