import { ChevronLeft, Sparkles } from 'lucide-react';
import { NavLink, useParams } from 'react-router-dom';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useAuth } from '@/app/providers';
import { getVisibleNavigation, groupNavigation } from './navigation';

export interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const { workspaceId = 'demo-workspace' } = useParams();
  const { user } = useAuth();
  const groups = user ? groupNavigation(getVisibleNavigation(user.role, user.plan)) : [];
  return (
    <aside aria-label="Primary sidebar" className={cn('fixed inset-y-0 start-0 z-30 hidden border-e border-slate-200 bg-white transition-[width] duration-200 lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-950', collapsed ? 'w-20' : 'w-64')}>
      <div className={cn('flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800', collapsed && 'justify-center px-2')}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white"><Sparkles size={18} /></span>
        {!collapsed ? <span className="font-bold tracking-tight">MarketFlow</span> : null}
      </div>
      <div className={cn('p-3', collapsed && 'px-[1.125rem]')}><WorkspaceSwitcher collapsed={collapsed} /></div>
      <nav aria-label="Application navigation" className="flex-1 space-y-5 overflow-y-auto p-3">
        {groups.map((group) => <div key={group.label}>{!collapsed ? <h2 className="mb-1 px-3 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">{group.label}</h2> : <span className="mx-auto mb-2 block h-px w-8 bg-slate-200 first:hidden dark:bg-slate-800" />}{group.items.map(({ href, icon: Icon, label }) => (
          <NavLink aria-label={collapsed ? label : undefined} className={({ isActive }) => cn('flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white', isActive && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300', collapsed && 'justify-center px-0')} end={href !== '/contacts'} key={href} title={collapsed ? label : undefined} to={`/app/${workspaceId}${href}`}>
            <Icon className="shrink-0" size={19} />{!collapsed ? <span>{label}</span> : null}
          </NavLink>
        ))}</div>)}
      </nav>
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <Button aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className={cn('w-full', collapsed && 'px-0')} onClick={() => onCollapsedChange(!collapsed)} variant="ghost">
          <ChevronLeft className={cn('transition rtl:rotate-180', collapsed && 'rotate-180 rtl:rotate-0')} size={18} />{!collapsed ? 'Collapse' : null}
        </Button>
      </div>
    </aside>
  );
}
