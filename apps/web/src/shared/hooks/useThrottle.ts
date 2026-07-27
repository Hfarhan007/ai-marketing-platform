import { useEffect, useRef, useState } from 'react';
export function useThrottle<Value>(value: Value, delay = 200) {
  const [throttled, setThrottled] = useState(value);
  const lastUpdate = useRef(0);
  useEffect(() => {
    const remaining = Math.max(0, delay - (Date.now() - lastUpdate.current));
    const timer = window.setTimeout(() => { lastUpdate.current = Date.now(); setThrottled(value); }, remaining);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return throttled;
}
