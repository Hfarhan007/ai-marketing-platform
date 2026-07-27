import { useMatches } from 'react-router-dom';
import type { RouteMetadata } from './route-types';

interface RouteHandle { metadata: RouteMetadata }

function hasMetadata(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null && 'metadata' in value;
}

export function useRouteMetadata() {
  const matches = useMatches();
  return matches.flatMap((match) => hasMetadata(match.handle) ? [match.handle.metadata] : []);
}
