import { useState } from 'react';
import { Button, EmptyState, Tabs } from '@/shared/ui';
import { TaskBoard } from '../components/TaskBoard';
import { TaskFilters } from '../components/TaskFilters';
import { TaskTable } from '../components/TaskTable';
import type { Task } from '../types/task.types';

const tasks: Task[] = [
  { assignedUser: 'Amina Yusuf', createdAt: '2026-07-20', description: 'Confirm campaign scope and owners.', dueDate: '2026-07-25', id: 'task-1', priority: 'high', relatedContact: 'Nora Reed', status: 'in-progress', tags: ['campaign'], title: 'Finalize launch brief' },
  { assignedUser: 'Omar Ali', createdAt: '2026-07-21', description: 'Prepare notes before the renewal call.', dueDate: '2026-07-27', id: 'task-2', priority: 'medium', relatedDeal: 'Northstar renewal', status: 'todo', tags: ['sales'], title: 'Review renewal account' },
  { assignedUser: 'Priya Shah', createdAt: '2026-07-18', description: 'Share onboarding checklist.', dueDate: '2026-07-22', id: 'task-3', priority: 'low', status: 'done', tags: ['onboarding'], title: 'Send onboarding pack' },
];

export function TasksPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const filtered = tasks.filter((task) => task.title.toLowerCase().includes(query.toLowerCase()) && (!status || task.status === status));
  return <div className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Tasks</h1><p className="text-slate-500">Coordinate work across contacts, deals, and campaigns.</p></div><Button>Create task</Button></header><TaskFilters onSearch={setQuery} onStatus={setStatus} />{filtered.length ? <Tabs items={[{ value: 'list', label: 'List', content: <TaskTable tasks={filtered} /> }, { value: 'board', label: 'Board', content: <TaskBoard tasks={filtered} /> }]} /> : <EmptyState title="No tasks found" description="Adjust your search or filters." />}</div>;
}

export default TasksPage;
