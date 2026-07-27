import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';

export interface PublicLayoutProps {
  children?: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return <div className="flex min-h-screen flex-col bg-white text-slate-950 dark:bg-slate-950 dark:text-white"><PublicHeader /><main className="flex-1 outline-none" id="main-content" tabIndex={-1}>{children ?? <Outlet />}</main><PublicFooter /></div>;
}
