import { useSyncExternalStore } from 'react';
export function useMediaQuery(query: string, serverValue = false) {
  const media = typeof window === 'undefined' ? null : window.matchMedia(query);
  return useSyncExternalStore(
    (listener) => { media?.addEventListener('change', listener); return () => media?.removeEventListener('change', listener); },
    () => media?.matches ?? serverValue,
    () => serverValue,
  );
}
