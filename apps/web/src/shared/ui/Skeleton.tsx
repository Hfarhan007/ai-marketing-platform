import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  height?: number | string;
  width?: number | string;
}

export function Skeleton({ className, height, width, ...props }: SkeletonProps) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className)} style={{ height, width }} {...props} />;
}
