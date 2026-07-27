export type TaskStatus = 'todo' | 'in-progress' | 'done';
export interface Task {
  assignedUser: string;
  createdAt: string;
  description: string;
  dueDate: string;
  id: string;
  priority: 'low' | 'medium' | 'high';
  relatedContact?: string;
  relatedDeal?: string;
  status: TaskStatus;
  tags: string[];
  title: string;
}
