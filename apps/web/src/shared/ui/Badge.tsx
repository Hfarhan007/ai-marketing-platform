import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', {
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200': tone === 'neutral',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300': tone === 'primary',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300': tone === 'success',
    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300': tone === 'warning',
    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300': tone === 'danger',
  }, className)} {...props} />;
}
