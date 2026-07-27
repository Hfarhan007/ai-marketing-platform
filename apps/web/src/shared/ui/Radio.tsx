import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  description?: string;
  label: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, description, label, ...props }, ref) => (
    <label className={cn('flex items-start gap-3 text-sm', props.disabled && 'cursor-not-allowed opacity-60', className)}>
      <input className="mt-0.5 size-4 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-900" ref={ref} type="radio" {...props} />
      <span><span className="font-medium">{label}</span>{description ? <span className="block text-slate-500 dark:text-slate-400">{description}</span> : null}</span>
    </label>
  ),
);
Radio.displayName = 'Radio';
