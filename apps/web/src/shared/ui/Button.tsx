import { LoaderCircle } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, disabled, loading = false, size = 'md', variant = 'primary', ...props }, ref) => (
    <button
      aria-busy={loading}
      className={cn(
        'inline-flex min-w-0 items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-50',
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 text-sm': size === 'md',
          'h-12 px-6 text-base': size === 'lg',
          'bg-indigo-600 text-white hover:bg-indigo-500': variant === 'primary',
          'bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600': variant === 'secondary',
          'border border-slate-300 bg-transparent text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800': variant === 'outline',
          'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800': variant === 'ghost',
          'bg-red-600 text-white hover:bg-red-500': variant === 'danger',
        },
        className,
      )}
      disabled={disabled || loading}
      ref={ref}
      type={props.type ?? 'button'}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : null}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
