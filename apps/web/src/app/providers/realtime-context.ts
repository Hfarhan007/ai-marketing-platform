import { createContext, useContext } from 'react';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

export interface RealtimeContextValue {
  connect: () => void;
  disconnect: () => void;
  simulateIncomingMessage: (message: RealtimeMessage) => void;
  status: RealtimeStatus;
  subscribe: (listener: (message: RealtimeMessage) => void) => () => void;
}

export interface RealtimeMessage {
  channel: string;
  id: string;
  payload: Readonly<Record<string, unknown>>;
  receivedAt: string;
}

export const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within RealtimeProvider');
  return context;
}
