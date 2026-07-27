import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export interface BuilderCanvasProps {
  children?: ReactNode;
  device: 'desktop' | 'tablet' | 'mobile';
}

export function BuilderCanvas({ children, device }: BuilderCanvasProps) {
  return (
    <main className="min-h-0 overflow-auto bg-slate-100 p-4 sm:p-8 dark:bg-slate-900">
      <div className={cn('mx-auto min-h-[calc(100vh-7.5rem)] overflow-hidden rounded-lg bg-white shadow-xl transition-[max-width] dark:bg-slate-950', device === 'desktop' && 'max-w-6xl', device === 'tablet' && 'max-w-3xl', device === 'mobile' && 'max-w-sm')}>
        {children ?? <div className="grid min-h-[32rem] place-items-center border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-8 text-center dark:border-indigo-800 dark:bg-indigo-950/20"><div><p className="font-semibold">Builder canvas</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Drag elements here to begin composing.</p></div></div>}
      </div>
    </main>
  );
}
