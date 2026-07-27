import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  action?: ReactNode;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
  title: string;
}

export function EmptyState({ action, description, disabled, icon = <Inbox size={28} />, title }: EmptyStateProps) {
  return <section className="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700"><div className="max-w-sm"><span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">{icon}</span><h3 className="mt-4 font-semibold">{title}</h3>{description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}{action ? <div className={`mt-4 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>{action}</div> : null}</div></section>;
}
