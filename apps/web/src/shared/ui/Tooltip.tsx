import { cloneElement, type ReactElement, type ReactNode, useId } from 'react';
import { cn } from '@/shared/utils/cn';

export interface TooltipProps {
  children: ReactElement<{ 'aria-describedby'?: string }>;
  content: ReactNode;
  side?: 'top' | 'bottom';
}

export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      {cloneElement(children, { 'aria-describedby': id })}
      <span className={cn('pointer-events-none absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2 rounded-md bg-slate-950 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition group-focus-within:opacity-100 group-hover:opacity-100 dark:bg-white dark:text-slate-950', side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2')} id={id} role="tooltip">{content}</span>
    </span>
  );
}
