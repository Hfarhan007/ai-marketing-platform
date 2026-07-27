import type { ReactNode } from 'react';

export interface TimelineItem {
  content?: ReactNode;
  date?: string;
  id: string;
  title: string;
}

export interface TimelineProps {
  items: readonly TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return <ol className="relative ml-2 border-l border-slate-200 dark:border-slate-700">
    {items.map((item) => <li className="relative pb-6 pl-6 last:pb-0" key={item.id}><span aria-hidden="true" className="absolute -left-1.5 top-1 size-3 rounded-full border-2 border-white bg-indigo-600 dark:border-slate-950" /><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-medium">{item.title}</h3>{item.date ? <time className="text-xs text-slate-500 dark:text-slate-400">{item.date}</time> : null}</div>{item.content ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.content}</div> : null}</li>)}
  </ol>;
}
