import { mockTasks } from '../mocks/task.data';
export async function listTasks() { await new Promise((resolve) => window.setTimeout(resolve, 150)); return [...mockTasks]; }
