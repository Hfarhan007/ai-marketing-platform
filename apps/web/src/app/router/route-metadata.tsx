import { useEffect } from 'react';
import { useRouteMetadata } from './use-route-metadata';

export function RouteMetadataManager() {
  const metadata = useRouteMetadata();
  const current = metadata.at(-1);
  useEffect(() => {
    document.title = current ? `${current.title} | MarketFlow` : 'MarketFlow';
  }, [current]);
  return null;
}
