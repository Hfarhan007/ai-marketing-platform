import { useQuery } from '@tanstack/react-query';
import { listTasks } from '../api/tasks.mock';
export function useTasks() { return useQuery({ queryKey: ['tasks'], queryFn: listTasks }); }
