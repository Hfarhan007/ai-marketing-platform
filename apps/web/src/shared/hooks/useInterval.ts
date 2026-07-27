import { useEffect, useEffectEvent } from 'react';
export function useInterval(callback: () => void, delay: number | null) {
  const onInterval = useEffectEvent(callback);
  useEffect(() => {
    if (delay === null) return;
    const timer = window.setInterval(onInterval, delay);
    return () => window.clearInterval(timer);
  }, [delay]);
}
