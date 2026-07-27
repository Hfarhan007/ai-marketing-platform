import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes, useId } from 'react';
import { cn } from '@/shared/utils/cn';

export interface SelectOption {
  disabled?: boolean;
  label: string;
  value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | undefined;
  label?: string;
  options: readonly SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, id, label, options, placeholder, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? props.name ?? generatedId;
    const errorId = error ? `${selectId}-error` : undefined;
    return (
      <div className="grid gap-1.5 text-sm font-medium">
        {label ? <label htmlFor={selectId}>{label}</label> : null}
        <span className="relative">
          <select
            aria-describedby={errorId}
            aria-invalid={Boolean(error)}
            className={cn(
              'h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pe-10 text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50',
              error && 'border-red-500',
              className,
            )}
            id={selectId}
            ref={ref}
            {...props}
          >
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((option) => <option disabled={option.disabled} key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        </span>
        {error ? <span className="text-sm text-red-600 dark:text-red-400" id={errorId}>{error}</span> : null}
      </div>
    );
  },
);
Select.displayName = 'Select';
