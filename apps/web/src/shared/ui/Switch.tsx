import { forwardRef, type ButtonHTMLAttributes, useState } from 'react';
import { cn } from '@/shared/utils/cn';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'defaultValue' | 'onChange' | 'value'> {
  checked?: boolean;
  defaultChecked?: boolean;
  description?: string;
  label: string;
  onCheckedChange?: (checked: boolean) => void;
  size?: 'sm' | 'md';
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(({ checked, className, defaultChecked = false, description, disabled, label, onCheckedChange, size = 'md', ...props }, ref) => {
  const [internal, setInternal] = useState(defaultChecked);
  const active = checked ?? internal;
  const change = () => {
    if (checked === undefined) setInternal(!active);
    onCheckedChange?.(!active);
  };
  return <button aria-checked={active} className={cn('inline-flex items-center gap-3 rounded-md text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} disabled={disabled} onClick={change} ref={ref} role="switch" type="button" {...props}><span aria-hidden="true" className={cn('relative shrink-0 rounded-full transition', size === 'sm' ? 'h-5 w-9' : 'h-6 w-11', active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700')}><span className={cn('absolute start-0.5 top-0.5 rounded-full bg-white shadow transition-[inset-inline-start]', size === 'sm' ? 'size-4' : 'size-5', active && (size === 'sm' ? 'start-[1.125rem]' : 'start-[1.375rem]'))} /></span><span><span className="block text-sm font-medium">{label}</span>{description ? <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span> : null}</span></button>;
});
Switch.displayName = 'Switch';
