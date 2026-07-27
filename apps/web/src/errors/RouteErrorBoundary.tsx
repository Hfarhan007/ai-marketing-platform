import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ErrorFallback } from './ErrorFallback';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const normalized = isRouteErrorResponse(error)
    ? new Error(`${error.status}: ${error.statusText}`)
    : error;
  return <ErrorFallback error={normalized} onRetry={() => window.location.reload()} />;
}
