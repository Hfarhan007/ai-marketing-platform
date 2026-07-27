import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

export interface FullscreenLayoutProps {
  children?: ReactNode;
  label?: string;
}

export function FullscreenLayout({ children, label = 'Fullscreen content' }: FullscreenLayoutProps) {
  return <main aria-label={label} className="h-dvh w-full overflow-auto bg-white text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:bg-slate-950 dark:text-white" id="main-content" tabIndex={-1}>{children ?? <Outlet />}</main>;
}
