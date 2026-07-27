import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthSidebar } from './AuthSidebar';

export interface AuthLayoutProps {
  children?: ReactNode;
  illustration?: ReactNode;
  title?: string;
}

export function AuthLayout({ children, illustration, title = 'Welcome back' }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-white text-slate-950 lg:grid-cols-[minmax(22rem,0.9fr)_minmax(30rem,1.1fr)] dark:bg-slate-950 dark:text-white">
      <AuthSidebar illustration={illustration} />
      <main className="flex min-h-screen items-center justify-center px-5 py-10 outline-none sm:px-10" id="main-content" tabIndex={-1}>
        <div className="w-full max-w-md">
          <a className="mb-10 flex items-center gap-2 font-bold lg:hidden" href="/"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white"><Sparkles size={17} /></span>MarketFlow</a>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Enter your details to continue securely.</p>
          <div className="mt-8">{children ?? <Outlet />}</div>
        </div>
      </main>
    </div>
  );
}
