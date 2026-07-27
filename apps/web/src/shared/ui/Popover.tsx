import { cloneElement, type MouseEventHandler, type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';

export interface PopoverProps {
  children: ReactElement<{
    'aria-expanded'?: boolean;
    'aria-haspopup'?: 'dialog';
    disabled?: boolean;
    onClick?: MouseEventHandler<HTMLElement>;
  }>;
  content: ReactNode;
  disabled?: boolean;
  label: string;
}

export function Popover({ children, content, disabled, label }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') setOpen(false);
      if (event instanceof MouseEvent && !rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  const triggerDisabled = disabled || children.props.disabled;
  const trigger = cloneElement(children, {
    'aria-expanded': open,
    'aria-haspopup': 'dialog',
    ...(triggerDisabled === undefined ? {} : { disabled: triggerDisabled }),
    onClick: (event) => {
      children.props.onClick?.(event);
      if (!event.defaultPrevented) setOpen((value) => !value);
    },
  });
  return (
    <div className="relative inline-flex" ref={rootRef}>
      {trigger}
      {open ? <div aria-label={label} className={cn('absolute right-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900')} role="dialog">{content}</div> : null}
    </div>
  );
}
