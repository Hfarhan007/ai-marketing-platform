export const TRIGGER_NODE_TYPES = [
  'contact.created',
  'lead.created',
  'lead.updated',
  'lead.qualified',
  'lead.disqualified',
  'lead.converted',
  'form.submitted',
  'message.received',
  'appointment.booked',
  'deal.created',
  'deal.stage_changed',
  'integration.connected',
  'campaign.status_changed',
  'trigger.schedule',
  'trigger.webhook',
  'trigger.manual',
] as const;
export const ACTION_NODE_TYPES = [
  'send.email',
  'send.sms',
  'send.whatsapp',
  'tag.add',
  'tag.remove',
  'user.assign',
  'task.create',
  'contact.update',
  'webhook.call',
  'ai.qualify',
  'ai.summarize',
  'ai.extract',
  'delay',
  'wait.until',
  'condition',
  'branch',
  'loop',
  'terminate',
] as const;
export const NODE_TYPES = [...TRIGGER_NODE_TYPES, ...ACTION_NODE_TYPES] as const;
export type WorkflowNodeType = (typeof NODE_TYPES)[number];
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  config: Record<string, unknown>;
  retry?: { attempts: number; backoffMs: number };
}
export interface WorkflowEdge {
  source: string;
  target: string;
  branch?: string;
}
export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
export interface ExecutionContext {
  workspaceId: string;
  runId: string;
  correlationId: string;
  input: Record<string, unknown>;
  variables: Record<string, unknown>;
}
export interface NodeResult {
  state: 'completed' | 'waiting' | 'terminated';
  output?: Record<string, unknown>;
  nextBranch?: string;
  resumeAt?: Date;
}
export interface WorkflowJob {
  workspaceId: string;
  runId: string;
  nodeId: string;
  correlationId: string;
  attempt: number;
}
