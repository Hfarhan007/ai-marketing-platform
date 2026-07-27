import { forwardRef, type TextareaHTMLAttributes, useId } from 'react';
import { cn } from '@/shared/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | undefined;
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, id, label, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? props.name ?? generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    return (
      <div className="grid gap-1.5 text-sm font-medium">
        {label ? <label htmlFor={textareaId}>{label}</label> : null}
        <textarea
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          className={cn(
            'min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
            error && 'border-red-500',
            className,
          )}
          id={textareaId}
          ref={ref}
          {...props}
        />
        {error ? <span className="text-sm text-red-600 dark:text-red-400" id={errorId}>{error}</span> : null}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
