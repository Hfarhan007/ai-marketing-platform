import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cn } from '@/shared/utils/cn';

export interface ModalProps {
  children: ReactNode;
  description?: string;
  loading?: boolean;
  onClose: () => void;
  open: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  title: string;
}

export function Modal({ children, description, loading, onClose, open, size = 'md', title }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
      const first = focusable[0]; const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [loading, onClose, open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4">
      <button aria-label="Close modal" className="absolute inset-0 cursor-default" disabled={loading} onClick={onClose} type="button" />
      <div aria-busy={loading} aria-describedby={description ? descriptionId : undefined} aria-labelledby={titleId} aria-modal="true" className={cn('relative w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900', size === 'sm' && 'max-w-sm', size === 'md' && 'max-w-lg', size === 'lg' && 'max-w-2xl', size === 'xl' && 'max-w-4xl')} ref={panelRef} role="dialog" tabIndex={-1}>
        <Button aria-label="Close modal" className="absolute end-3 top-3" disabled={loading} onClick={onClose} size="sm" variant="ghost"><X size={18} /></Button>
        <h2 className="pe-10 text-xl font-semibold" id={titleId}>{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400" id={descriptionId}>{description}</p> : null}
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
