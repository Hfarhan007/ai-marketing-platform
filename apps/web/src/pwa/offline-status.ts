import { useSyncExternalStore } from 'react';

export type NetworkStatus = 'offline' | 'online';

const subscribe = (listener: () => void) => {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
};

export function useOnlineStatus(): NetworkStatus {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine ? 'online' : 'offline',
    () => 'online',
  );
}

export function useOfflineStatus() {
  return useOnlineStatus() === 'offline';
}
