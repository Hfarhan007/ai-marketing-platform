import { useSyncExternalStore } from 'react';
export function useNetworkStatus() { return useSyncExternalStore((listener) => { window.addEventListener('online', listener); window.addEventListener('offline', listener); return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener); }; }, () => navigator.onLine); }
