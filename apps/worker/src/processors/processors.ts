import type { JobPayload, QueueName } from '../jobs/job.types.js';
export interface ProcessorContext {
  progress(value: number): Promise<void>;
  signal: AbortSignal;
}
export type JobProcessor = (
  payload: JobPayload,
  context: ProcessorContext,
) => Promise<Record<string, unknown>>;
const mockExternal: JobProcessor = async (payload, context) => {
  await context.progress(25);
  if (context.signal.aborted) throw new Error('Job aborted');
  await context.progress(100);
  return { mocked: true, workspaceId: payload.workspaceId };
};
const generic: JobProcessor = async (payload, context) => {
  await context.progress(50);
  if (context.signal.aborted) throw new Error('Job aborted');
  await context.progress(100);
  return { processed: true, workspaceId: payload.workspaceId };
};
export function createProcessorRegistry(): Record<QueueName, JobProcessor> {
  return {
    email: mockExternal,
    sms: mockExternal,
    whatsapp: mockExternal,
    'inbox-delivery': mockExternal,
    'webhook-processing': generic,
    'webhook-delivery': mockExternal,
    'workflow-execution': generic,
    'workflow-resume': generic,
    'campaign-scheduling': generic,
    'campaign-delivery': mockExternal,
    ai: mockExternal,
    embeddings: mockExternal,
    'document-processing': generic,
    'file-processing': generic,
    notifications: mockExternal,
    analytics: generic,
    imports: generic,
    exports: generic,
    cleanup: generic,
  };
}
