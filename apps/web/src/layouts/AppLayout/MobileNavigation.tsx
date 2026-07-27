import { Sparkles, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useAuth } from '@/app/providers';
import { getVisibleNavigation, groupNavigation } from './navigation';

export interface MobileNavigationProps {
  onClose: () => void;
  open: boolean;
}

export function MobileNavigation({ onClose, open }: MobileNavigationProps) {
  const { workspaceId = 'demo-workspace' } = useParams();
  const { user } = useAuth();
  const groups = user ? groupNavigation(getVisibleNavigation(user.role, user.plan)) : [];
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = overflow; previous?.focus(); };
  }, [onClose, open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 lg:hidden">
      <button aria-label="Close mobile navigation" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />
      <aside aria-label="Mobile navigation" aria-modal="true" className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-white shadow-2xl dark:bg-slate-950" role="dialog">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800"><span className="flex items-center gap-3 font-bold"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white"><Sparkles size={18} /></span>MarketFlow</span><Button aria-label="Close navigation" onClick={onClose} ref={closeRef} size="sm" variant="ghost"><X size={20} /></Button></div>
        <div className="p-4"><WorkspaceSwitcher /></div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-5" aria-label="Mobile application navigation">{groups.map((group) => <div key={group.label}><h2 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{group.label}</h2>{group.items.map(({ href, icon: Icon, label }) => <NavLink className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300', isActive && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300')} key={href} onClick={onClose} to={`/app/${workspaceId}${href}`}><Icon size={19} />{label}</NavLink>)}</div>)}</nav>
      </aside>
    </div>
  );
}
