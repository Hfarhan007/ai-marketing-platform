import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export interface LoadingOverlayProps {
  children: ReactNode;
  label?: string;
  loading: boolean;
}

export function LoadingOverlay({ children, label = 'Loading', loading }: LoadingOverlayProps) {
  return <div aria-busy={loading} className="relative">{children}{loading ? <div className="absolute inset-0 z-20 grid place-items-center rounded-[inherit] bg-white/75 backdrop-blur-sm dark:bg-slate-950/75"><div className={cn('flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium shadow-lg dark:bg-slate-900')} role="status"><LoaderCircle aria-hidden="true" className="animate-spin" size={18} />{label}</div></div> : null}</div>;
}
