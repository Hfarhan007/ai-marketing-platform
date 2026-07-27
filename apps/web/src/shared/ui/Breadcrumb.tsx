import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface BreadcrumbItem {
  href?: string;
  label: ReactNode;
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return <nav aria-label="Breadcrumb"><ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
    {items.map((item, index) => {
      const current = index === items.length - 1;
      return <li className="flex min-w-0 items-center gap-1" key={index}>{index > 0 ? <ChevronRight aria-hidden="true" className="shrink-0" size={14} /> : null}{item.href && !current ? <a className="truncate rounded-sm hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:text-white" href={item.href}>{item.label}</a> : <span aria-current={current ? 'page' : undefined} className={current ? 'truncate font-medium text-slate-900 dark:text-white' : 'truncate'}>{item.label}</span>}</li>;
    })}
  </ol></nav>;
}
