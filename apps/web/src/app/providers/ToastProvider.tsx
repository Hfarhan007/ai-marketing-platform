import { X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContext, type ToastInput, type ToastMessage } from './toast-context';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (input: ToastInput) => {
      const id = ++nextId.current;
      const toast: ToastMessage = { ...input, id, tone: input.tone ?? 'info' };
      setToasts((current) => [...current, toast]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), input.duration ?? 5_000));
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ dismiss, notify }), [dismiss, notify]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="toast-viewport">
        {toasts.map((toast) => (
          <section className="toast" data-tone={toast.tone} key={toast.id} role={toast.tone === 'error' ? 'alert' : 'status'}>
            <div>
              <strong>{toast.title}</strong>
              {toast.description ? <p>{toast.description}</p> : null}
            </div>
            <button aria-label="Dismiss notification" onClick={() => dismiss(toast.id)} type="button">
              <X aria-hidden="true" size={16} />
            </button>
          </section>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
