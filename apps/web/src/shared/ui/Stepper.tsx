import { Check } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export interface StepperItem {
  description?: string;
  disabled?: boolean;
  label: string;
}

export interface StepperProps {
  currentStep: number;
  items: readonly StepperItem[];
  onStepChange?: (step: number) => void;
}

export function Stepper({ currentStep, items, onStepChange }: StepperProps) {
  return <ol className="grid gap-3 sm:grid-cols-[repeat(var(--step-count),minmax(0,1fr))]" style={{ '--step-count': items.length } as React.CSSProperties}>
    {items.map((item, index) => {
      const complete = index < currentStep;
      const current = index === currentStep;
      return <li aria-current={current ? 'step' : undefined} className="relative" key={item.label}><button className="flex w-full items-start gap-3 rounded-lg p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={item.disabled || !onStepChange} onClick={() => onStepChange?.(index)} type="button"><span className={cn('grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold', complete || current ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600')}>{complete ? <Check size={16} /> : index + 1}</span><span><span className="block text-sm font-medium">{item.label}</span>{item.description ? <span className="block text-xs text-slate-500 dark:text-slate-400">{item.description}</span> : null}</span></button></li>;
    })}
  </ol>;
}
