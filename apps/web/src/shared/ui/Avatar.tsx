import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  alt: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string;
}

export function Avatar({ alt, className, fallback, size = 'md', src, ...props }: AvatarProps) {
  const initials = fallback ?? alt.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className={cn('inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-indigo-100 font-semibold text-indigo-700 ring-1 ring-slate-200 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-slate-700', {
      'size-8 text-xs': size === 'sm', 'size-10 text-sm': size === 'md', 'size-14 text-base': size === 'lg',
    }, className)} {...props}>
      {src ? <img alt={alt} className="size-full object-cover" src={src} /> : <span aria-label={alt}>{initials}</span>}
    </span>
  );
}
