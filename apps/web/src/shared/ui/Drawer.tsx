import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { cn } from '@/shared/utils/cn';

export interface DrawerProps {
  children: ReactNode;
  disabled?: boolean;
  onClose: () => void;
  open: boolean;
  side?: 'left' | 'right';
  title: string;
  width?: 'sm' | 'md' | 'lg';
}

export function Drawer({ children, disabled, onClose, open, side = 'right', title, width = 'md' }: DrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !disabled) onClose(); };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, [disabled, onClose, open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/60">
      <button aria-label="Close drawer" className="absolute inset-0 cursor-default" disabled={disabled} onClick={onClose} type="button" />
      <aside aria-labelledby={titleId} aria-modal="true" className={cn('absolute inset-y-0 overflow-y-auto bg-white p-6 shadow-2xl outline-none dark:bg-slate-900', width === 'sm' && 'w-[min(22rem,90vw)]', width === 'md' && 'w-[min(28rem,90vw)]', width === 'lg' && 'w-[min(40rem,95vw)]', side === 'right' ? 'end-0' : 'start-0')} ref={panelRef} role="dialog" tabIndex={-1}>
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold" id={titleId}>{title}</h2><Button aria-label="Close drawer" disabled={disabled} onClick={onClose} size="sm" variant="ghost"><X size={18} /></Button></div>
        <div className="mt-5">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
