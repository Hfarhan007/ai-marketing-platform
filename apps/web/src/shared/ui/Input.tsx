import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';
import { cn } from '@/shared/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string | undefined;
  label?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, id, label, leading, trailing, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? props.name ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="grid min-w-0 gap-1.5 text-sm font-medium">
        {label ? <label htmlFor={inputId}>{label}</label> : null}
        <span className="relative flex items-center">
          {leading ? <span className="pointer-events-none absolute start-3 text-slate-500">{leading}</span> : null}
          <input
            aria-describedby={errorId}
            aria-invalid={Boolean(error)}
            className={cn(
              'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-950 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:disabled:bg-slate-800',
              leading && 'ps-10',
              trailing && 'pe-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className,
            )}
            id={inputId}
            ref={ref}
            {...props}
          />
          {trailing ? <span className="absolute end-3 text-slate-500">{trailing}</span> : null}
        </span>
        {error ? <span className="text-sm text-red-600 dark:text-red-400" id={errorId}>{error}</span> : null}
      </div>
    );
  },
);
Input.displayName = 'Input';
