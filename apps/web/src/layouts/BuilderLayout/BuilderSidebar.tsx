import { Heading, Image, LayoutGrid, MousePointerClick, Type } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

const elements = [{ icon: Type, label: 'Text' }, { icon: Heading, label: 'Heading' }, { icon: Image, label: 'Image' }, { icon: MousePointerClick, label: 'Button' }, { icon: LayoutGrid, label: 'Section' }] as const;

export function BuilderSidebar({ mobile = false, onInsert }: { mobile?: boolean; onInsert?: () => void }) {
  return (
    <aside aria-label="Element library" className={cn('min-h-0 h-full overflow-y-auto border-e border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950', !mobile && 'hidden md:block')}>
      <h2 className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Elements</h2>
      <div className="grid grid-cols-2 gap-2">{elements.map(({ icon: Icon, label }) => <button className="grid min-h-20 place-items-center rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-medium transition hover:border-indigo-400 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-indigo-950" draggable key={label} onClick={onInsert} type="button"><Icon className="mb-1 text-slate-500" size={20} />{label}</button>)}</div>
      <h2 className="mt-6 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Layers</h2>
      <ul className="space-y-1 text-sm"><li><button className="w-full rounded-md bg-indigo-50 px-3 py-2 text-left text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-indigo-950 dark:text-indigo-300" type="button">Hero section</button></li><li><button className="w-full rounded-md px-3 py-2 text-left hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-900" type="button">Content section</button></li></ul>
    </aside>
  );
}
