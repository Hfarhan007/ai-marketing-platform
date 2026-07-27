import { ClipboardCheck } from 'lucide-react';
import type { TaskSummary } from '../types/dashboard.types';

export function TasksOverview({ tasks }: { tasks: readonly TaskSummary[] }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="font-semibold">Tasks overview</h2><ClipboardCheck className="text-slate-400" size={19} /></div><div className="mt-5 space-y-5">{tasks.map((task) => { const progress = Math.round((task.completed / task.total) * 100); return <div key={task.label}><div className="mb-2 flex justify-between text-sm"><span>{task.label}</span><span className="font-medium">{task.completed}/{task.total}</span></div><div aria-label={`${task.label}: ${progress}% complete`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} /></div></div>; })}</div></section>;
}
