import { useMemo, useState, type ReactNode } from 'react';
import { LiveRegionContext } from './live-region-context';

export function LiveRegion({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const announce = useMemo(() => (next: string) => {
    setMessage('');
    window.setTimeout(() => setMessage(next), 10);
  }, []);
  return <LiveRegionContext.Provider value={announce}>{children}<div className="sr-only" aria-live="polite" aria-atomic="true">{message}</div></LiveRegionContext.Provider>;
}
