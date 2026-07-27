import type { WorkflowDocument } from '../types/workflow.types';

const KEY = 'crm:workflows:v1';

const starter: WorkflowDocument[] = [
  { id: 'lead-nurture', name: 'New lead nurture', description: 'Qualify new leads and schedule a personalized follow-up.', status: 'published', updatedAt: '2026-07-22T12:00:00.000Z', nodes: [], edges: [] },
  { id: 'meeting-followup', name: 'Meeting follow-up', description: 'Send recap content and create an owner task.', status: 'draft', updatedAt: '2026-07-20T09:30:00.000Z', nodes: [], edges: [] },
  { id: 'inbound-routing', name: 'Inbound message routing', description: 'Categorize inbound messages and assign the right teammate.', status: 'published', updatedAt: '2026-07-18T16:10:00.000Z', nodes: [], edges: [] },
];

export function loadWorkflows(): WorkflowDocument[] {
  try { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) as WorkflowDocument[] : starter; } catch { return starter; }
}

export function loadWorkflow(id: string): WorkflowDocument | undefined {
  return loadWorkflows().find((workflow) => workflow.id === id);
}

export function saveWorkflow(workflow: WorkflowDocument) {
  const workflows = loadWorkflows();
  const next = workflows.some(({ id }) => id === workflow.id) ? workflows.map((item) => item.id === workflow.id ? workflow : item) : [workflow, ...workflows];
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function deleteWorkflow(id: string) {
  localStorage.setItem(KEY, JSON.stringify(loadWorkflows().filter((workflow) => workflow.id !== id)));
}
