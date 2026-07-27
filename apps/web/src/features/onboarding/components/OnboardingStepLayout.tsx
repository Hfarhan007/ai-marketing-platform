import type { ReactNode } from 'react';
import { Stepper } from '@/shared/ui';

const steps = ['Workspace', 'Industry', 'Goals', 'Channels', 'Team'] as const;

export interface OnboardingStepLayoutProps {
  children: ReactNode;
  description: string;
  step: number;
  title: string;
}

export function OnboardingStepLayout({ children, description, step, title }: OnboardingStepLayoutProps) {
  return (
    <div className="grid min-h-dvh place-items-center bg-slate-50 p-4 sm:p-6 dark:bg-slate-950">
      <section className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <Stepper currentStep={step} items={steps.map((label) => ({ label }))} />
        <div className="mx-auto mt-10 max-w-xl"><p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Step {step + 1} of {steps.length}</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 text-slate-500 dark:text-slate-400">{description}</p><div className="mt-8">{children}</div></div>
      </section>
    </div>
  );
}
