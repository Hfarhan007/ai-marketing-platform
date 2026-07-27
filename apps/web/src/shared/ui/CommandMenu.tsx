import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from './Input';
import { cn } from '@/shared/utils/cn';

export interface CommandItem {
  disabled?: boolean;
  id: string;
  keywords?: readonly string[];
  label: string;
  onSelect: () => void;
  shortcut?: string;
}

export interface CommandMenuProps {
  disabled?: boolean;
  emptyMessage?: string;
  items: readonly CommandItem[];
  label?: string;
}

export function CommandMenu({ disabled, emptyMessage = 'No commands found.', items, label = 'Command menu' }: CommandMenuProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const filtered = useMemo(() => items.filter((item) => `${item.label} ${item.keywords?.join(' ') ?? ''}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  return <div aria-label={label} className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
    <div className="border-b border-slate-200 p-2 dark:border-slate-700"><Input aria-autocomplete="list" aria-controls="command-list" aria-expanded="true" disabled={disabled} leading={<Search size={16} />} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setActive((value) => Math.min(value + 1, filtered.length - 1)); } if (event.key === 'ArrowUp') { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); } if (event.key === 'Enter') filtered[active]?.onSelect(); }} placeholder="Type a command…" role="combobox" value={query} /></div>
    <div className="max-h-72 overflow-y-auto p-1" id="command-list" role="listbox">{filtered.length ? filtered.map((item, index) => <button aria-selected={index === active} className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm outline-none hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800', index === active && 'bg-slate-100 dark:bg-slate-800')} disabled={disabled || item.disabled} key={item.id} onClick={item.onSelect} onMouseEnter={() => setActive(index)} role="option" type="button"><span>{item.label}</span>{item.shortcut ? <kbd className="text-xs text-slate-500">{item.shortcut}</kbd> : null}</button>) : <p className="p-6 text-center text-sm text-slate-500">{emptyMessage}</p>}</div>
  </div>;
}
