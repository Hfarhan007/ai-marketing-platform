import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  label: string;
  pulse?: boolean;
  status?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

export function StatusDot({ className, label, pulse, status = 'neutral', ...props }: StatusDotProps) {
  return <span className={cn('inline-flex items-center gap-2 text-sm', className)} {...props}><span aria-hidden="true" className={cn('size-2.5 rounded-full', pulse && 'animate-pulse', {
    'bg-slate-400': status === 'neutral', 'bg-emerald-500': status === 'success', 'bg-amber-500': status === 'warning', 'bg-red-500': status === 'danger', 'bg-sky-500': status === 'info',
  })} /><span>{label}</span></span>;
}
