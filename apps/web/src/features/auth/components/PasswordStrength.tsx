import { useMemo } from 'react';
import { cn } from '@/shared/utils/cn';
import { getPasswordStrength } from '../utils/password-strength';

export function PasswordStrength({ password }: { password: string }) {
  const score = useMemo(() => getPasswordStrength(password), [password]);
  const label = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][score];
  return (
    <div aria-live="polite">
      <div aria-hidden className="mt-2 grid grid-cols-5 gap-1">
        {Array.from({ length: 5 }, (_, index) => <span className={cn('h-1 rounded-full bg-slate-200 dark:bg-slate-700', index < score && (score < 3 ? 'bg-red-500' : score < 5 ? 'bg-amber-500' : 'bg-emerald-500'))} key={index} />)}
      </div>
      <p className="mt-1 text-xs text-slate-500">Password strength: {label}</p>
    </div>
  );
}
