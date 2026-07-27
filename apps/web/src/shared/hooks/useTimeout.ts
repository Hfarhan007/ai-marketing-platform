import { useEffect, useEffectEvent } from 'react';
export function useTimeout(callback: () => void, delay: number | null) {
  const onTimeout = useEffectEvent(callback);
  useEffect(() => {
    if (delay === null) return;
    const timer = window.setTimeout(onTimeout, delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
}
