import { Badge, Table } from '@/shared/ui';
import type { Task } from '../types/task.types';

export function TaskTable({ tasks }: { tasks: readonly Task[] }) {
  return <Table columns={[{ key: 'task', header: 'Task', render: (task) => <><span className="font-medium">{task.title}</span><span className="block text-xs text-slate-500">{task.description}</span></> }, { key: 'status', header: 'Status', render: (task) => <Badge>{task.status}</Badge> }, { key: 'priority', header: 'Priority', render: (task) => task.priority }, { key: 'due', header: 'Due', render: (task) => task.dueDate }, { key: 'owner', header: 'Owner', render: (task) => task.assignedUser }]} getRowKey={(task) => task.id} rows={tasks} />;
}
