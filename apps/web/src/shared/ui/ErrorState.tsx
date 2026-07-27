import { CircleAlert } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  description?: string;
  disabled?: boolean;
  loading?: boolean;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ description = 'Please try again in a moment.', disabled = false, loading = false, onRetry, title = 'Unable to load this content' }: ErrorStateProps) {
  return <section className="grid min-h-52 place-items-center rounded-xl border border-red-200 bg-red-50/50 p-6 text-center dark:border-red-900 dark:bg-red-950/20" role="alert"><div className="max-w-sm"><CircleAlert className="mx-auto text-red-600 dark:text-red-400" size={32} /><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>{onRetry ? <Button className="mt-4" disabled={disabled} loading={loading} onClick={onRetry} variant="outline">Try again</Button> : null}</div></section>;
}
