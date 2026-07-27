import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RealtimeContext, type RealtimeMessage, type RealtimeStatus } from './realtime-context';

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const connectionTimer = useRef<number | undefined>(undefined);
  const listeners = useRef(new Set<(message: RealtimeMessage) => void>());
  const connect = useCallback(() => {
    window.clearTimeout(connectionTimer.current);
    setStatus('connecting');
    connectionTimer.current = window.setTimeout(() => setStatus('connected'), 250);
  }, []);
  const disconnect = useCallback(() => {
    window.clearTimeout(connectionTimer.current);
    setStatus('disconnected');
  }, []);
  const subscribe = useCallback((listener: (message: RealtimeMessage) => void) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);
  const simulateIncomingMessage = useCallback((message: RealtimeMessage) => {
    listeners.current.forEach((listener) => listener(message));
  }, []);
  useEffect(() => () => window.clearTimeout(connectionTimer.current), []);
  const value = useMemo(
    () => ({
      connect,
      disconnect,
      simulateIncomingMessage,
      status,
      subscribe,
    }),
    [connect, disconnect, simulateIncomingMessage, status, subscribe],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
