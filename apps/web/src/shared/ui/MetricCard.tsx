import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from './Skeleton';
import { cn } from '@/shared/utils/cn';

export interface MetricCardProps {
  change?: number;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  loading?: boolean;
  value: ReactNode;
}

export function MetricCard({ change, description, disabled, icon, label, loading, value }: MetricCardProps) {
  const positive = (change ?? 0) > 0;
  const negative = (change ?? 0) < 0;
  return <article className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900', disabled && 'opacity-60')}>
    <div className="flex items-start justify-between gap-4"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>{icon ? <span className="text-slate-400">{icon}</span> : null}</div>
    {loading ? <Skeleton className="mt-3 h-8 w-28" /> : <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>}
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">{change !== undefined ? <span className={cn('inline-flex items-center gap-0.5 font-semibold', positive && 'text-emerald-600 dark:text-emerald-400', negative && 'text-red-600 dark:text-red-400', !positive && !negative && 'text-slate-500')}>{positive ? <ArrowUpRight size={14} /> : negative ? <ArrowDownRight size={14} /> : <Minus size={14} />}{Math.abs(change)}%</span> : null}{description ? <span className="text-slate-500 dark:text-slate-400">{description}</span> : null}</div>
  </article>;
}
