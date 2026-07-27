import { createContext, useContext } from 'react';

export type ToastTone = 'error' | 'info' | 'success' | 'warning';

export interface ToastInput {
  description?: string;
  duration?: number;
  title: string;
  tone?: ToastTone;
}

export interface ToastMessage extends ToastInput {
  id: number;
  tone: ToastTone;
}

export interface ToastContextValue {
  dismiss: (id: number) => void;
  notify: (toast: ToastInput) => number;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
