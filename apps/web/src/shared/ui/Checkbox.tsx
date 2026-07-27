import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  description?: string;
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, description, label, ...props }, ref) => (
    <label className={cn('flex items-start gap-3 text-sm', props.disabled && 'cursor-not-allowed opacity-60', className)}>
      <input className="mt-0.5 size-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-900" ref={ref} type="checkbox" {...props} />
      <span><span className="font-medium">{label}</span>{description ? <span className="block text-slate-500 dark:text-slate-400">{description}</span> : null}</span>
    </label>
  ),
);
Checkbox.displayName = 'Checkbox';
