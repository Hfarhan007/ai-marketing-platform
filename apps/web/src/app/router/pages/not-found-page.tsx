import { Home, SearchX } from 'lucide-react';
import { Button } from '@/shared/ui';

export default function NotFoundPage() {
  return <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 text-center dark:bg-slate-950"><div><SearchX className="mx-auto text-indigo-500" size={48} /><p className="mt-6 text-sm font-semibold text-indigo-600 dark:text-indigo-400">404</p><h1 className="mt-2 text-3xl font-bold">Page not found</h1><p className="mt-3 text-slate-500 dark:text-slate-400">The page may have moved or the address may be incorrect.</p><Button className="mt-6" onClick={() => { window.location.href = '/'; }}><Home size={17} />Return home</Button></div></main>;
}
