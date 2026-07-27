import { Search } from 'lucide-react';

export interface GlobalSearchProps { onOpen: () => void }

export function GlobalSearch({ onOpen }: GlobalSearchProps) {
  return (
    <button aria-keyshortcuts="Control+K Meta+K" aria-label="Open global search" className="flex h-10 w-full max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-start text-sm text-slate-500 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600" onClick={onOpen} type="button">
      <Search size={17} /><span className="min-w-0 flex-1 truncate">Search anything…</span><kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs sm:inline dark:border-slate-700 dark:bg-slate-800">Ctrl K</kbd>
    </button>
  );
}
