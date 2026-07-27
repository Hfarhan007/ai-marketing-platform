import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { cn } from '@/shared/utils/cn';

export interface ChartCardProps {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  disabled?: boolean;
  loading?: boolean;
  title: string;
}

export function ChartCard({ actions, children, description, disabled, loading, title }: ChartCardProps) {
  return <article className={cn('min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900', disabled && 'pointer-events-none opacity-60')}>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{title}</h3>{description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}</div>{actions}</header>
    <div className="mt-5 min-h-56 w-full" role="img" aria-label={`${title} chart`}>{loading ? <Skeleton className="h-56 w-full" /> : children}</div>
  </article>;
}
