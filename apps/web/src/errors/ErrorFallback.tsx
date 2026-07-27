import { Button } from '@/shared/ui';
import { errorMessages } from './error-messages';

export function ErrorFallback({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  return (
    <main className="grid min-h-[60vh] place-items-center p-6" role="alert">
      <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900 dark:bg-slate-950">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{errorMessages.unexpected}</p>
        {import.meta.env.DEV && error instanceof Error ? (
          <pre className="mt-4 max-h-40 overflow-auto rounded bg-slate-100 p-3 text-left text-xs dark:bg-slate-900">
            {error.message}
          </pre>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
          <Button variant="outline" onClick={() => window.location.assign('/app/demo-workspace/dashboard')}>
            Return to dashboard
          </Button>
        </div>
      </div>
    </main>
  );
}
