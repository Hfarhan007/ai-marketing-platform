import type { Task, TaskStatus } from '../types/task.types';
const statuses: readonly TaskStatus[] = ['todo', 'in-progress', 'done'];
export function TaskBoard({ tasks }: { tasks: readonly Task[] }) {
  return <div className="grid gap-4 md:grid-cols-3">{statuses.map((status) => <section className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900" key={status}><h2 className="mb-3 font-semibold capitalize">{status.replace('-', ' ')}</h2><div className="space-y-2">{tasks.filter((task) => task.status === status).map((task) => <article className="rounded-lg border bg-white p-3 dark:border-slate-700 dark:bg-slate-950" key={task.id}><p className="font-medium">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.assignedUser} · {task.dueDate}</p></article>)}</div></section>)}</div>;
}
