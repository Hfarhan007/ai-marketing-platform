import { type ReactNode, useCallback, useState } from 'react';
import { Outlet, useMatches, useParams } from 'react-router-dom';
import { Breadcrumb, Button } from '@/shared/ui';
import { useAppStore } from '@/app/store';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { CommandPalette } from './CommandPalette';
import { MobileNavigation } from './MobileNavigation';
import { cn } from '@/shared/utils/cn';

export interface AppLayoutProps {
  actions?: ReactNode;
  children?: ReactNode;
  contentWidth?: 'wide' | 'full';
}

export function AppLayout({ actions, children, contentWidth = 'wide' }: AppLayoutProps) {
  const matches = useMatches();
  const { workspaceId = 'demo-workspace' } = useParams();
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const openCommand = useCallback(() => setCommandOpen(true), []);
  const closeCommand = useCallback(() => setCommandOpen(false), []);
  const routeCrumbs = matches.flatMap((match) => {
    const handle = match.handle;
    if (typeof handle !== 'object' || handle === null || !('metadata' in handle)) return [];
    const metadata = handle.metadata;
    if (typeof metadata !== 'object' || metadata === null || !('breadcrumb' in metadata) || typeof metadata.breadcrumb !== 'string') return [];
    return [{ label: metadata.breadcrumb }];
  });
  const currentHandle: unknown = matches.at(-1)?.handle;
  const currentMetadata = typeof currentHandle === 'object' && currentHandle !== null && 'metadata' in currentHandle && typeof currentHandle.metadata === 'object' && currentHandle.metadata !== null
    ? currentHandle.metadata as { description?: string; title?: string }
    : {};
  const breadcrumbs = [
    { href: `/app/${workspaceId}/dashboard`, label: 'Workspace' },
    ...routeCrumbs.slice(-1),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <a className="fixed start-4 top-2 z-[70] -translate-y-16 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:translate-y-0" href="#main-content">Skip to content</a>
      <AppSidebar collapsed={!sidebarOpen} onCollapsedChange={(collapsed) => setSidebarOpen(!collapsed)} />
      <MobileNavigation onClose={() => setMobileOpen(false)} open={mobileOpen} />
      <div className={cn('min-h-screen transition-[padding] duration-200', sidebarOpen ? 'lg:ps-64' : 'lg:ps-20')}>
        <AppHeader onCommandOpen={openCommand} onMobileMenuOpen={() => setMobileOpen(true)} />
        <div className="border-b border-slate-200 bg-white px-4 py-4 lg:px-6 dark:border-slate-800 dark:bg-slate-950"><div className={cn('mx-auto w-full', contentWidth === 'wide' && 'max-w-[100rem]')}><Breadcrumb items={breadcrumbs} /><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{currentMetadata.title ?? routeCrumbs.at(-1)?.label ?? 'Workspace'}</h1>{currentMetadata.description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{currentMetadata.description}</p> : null}</div><div aria-label="Page actions" className="flex items-center gap-2">{actions ?? <Button onClick={openCommand} size="sm" variant="outline">Quick actions</Button>}</div></div></div></div>
        <main id="main-content" tabIndex={-1} className={cn('mx-auto w-full p-4 outline-none sm:p-6 lg:p-8', contentWidth === 'wide' && 'max-w-[100rem]')}>{children ?? <Outlet />}</main>
      </div>
      <CommandPalette onClose={closeCommand} onOpen={openCommand} open={commandOpen} />
    </div>
  );
}
