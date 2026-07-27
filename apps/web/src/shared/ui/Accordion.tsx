import { ChevronDown } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { cn } from '@/shared/utils/cn';

export interface AccordionItem {
  content: ReactNode;
  disabled?: boolean;
  id: string;
  title: string;
}

export interface AccordionProps {
  defaultOpen?: readonly string[];
  disabled?: boolean;
  items: readonly AccordionItem[];
  multiple?: boolean;
}

export function Accordion({ defaultOpen = [], disabled, items, multiple = false }: AccordionProps) {
  const baseId = useId();
  const [open, setOpen] = useState(() => new Set(defaultOpen));
  const toggle = (id: string) => setOpen((current) => {
    const next = multiple ? new Set(current) : new Set<string>();
    if (current.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
    {items.map((item) => {
      const expanded = open.has(item.id);
      return <section key={item.id}>
        <h3><button aria-controls={`${baseId}-${item.id}-panel`} aria-expanded={expanded} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled || item.disabled} id={`${baseId}-${item.id}-trigger`} onClick={() => toggle(item.id)} type="button">{item.title}<ChevronDown aria-hidden="true" className={cn('shrink-0 transition', expanded && 'rotate-180')} size={18} /></button></h3>
        {expanded ? <div aria-labelledby={`${baseId}-${item.id}-trigger`} className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-300" id={`${baseId}-${item.id}-panel`} role="region">{item.content}</div> : null}
      </section>;
    })}
  </div>;
}
