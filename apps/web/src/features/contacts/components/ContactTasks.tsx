import { useState } from 'react';
import { Button, Checkbox, EmptyState, Input } from '@/shared/ui';
import type { ContactTask } from '../types/contacts.types';

export function ContactTasks({ loading = false, onAdd, onToggle, tasks }: { loading?: boolean; onAdd: (title: string) => void; onToggle: (id: string) => void; tasks: readonly ContactTask[] }) {
  const [title, setTitle] = useState('');
  return <section><h2 className="text-base font-semibold">Tasks</h2><form className="mt-3 flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); if (!title.trim()) return; onAdd(title.trim()); setTitle(''); }}><Input aria-label="New task" className="flex-1" onChange={(event) => setTitle(event.target.value)} placeholder="Add a follow-up…" value={title} /><Button disabled={!title.trim()} loading={loading} size="sm" type="submit">Add</Button></form><div className="mt-5 space-y-3">{tasks.length ? tasks.map((task) => <div className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700" key={task.id}><Checkbox checked={task.completed} className={task.completed ? 'line-through opacity-60' : ''} label={task.title} onChange={() => onToggle(task.id)} /><time className="shrink-0 text-xs text-slate-500">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(task.dueAt))}</time></div>) : <EmptyState description="Add a follow-up to keep momentum." title="No open tasks" />}</div></section>;
}
