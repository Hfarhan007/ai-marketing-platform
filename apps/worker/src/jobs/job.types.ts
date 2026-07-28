import { z } from 'zod';
export const QUEUE_NAMES = [
  'email',
  'sms',
  'whatsapp',
  'inbox-delivery',
  'webhook-processing',
  'webhook-delivery',
  'workflow-execution',
  'workflow-resume',
  'campaign-scheduling',
  'campaign-delivery',
  'ai',
  'embeddings',
  'document-processing',
  'file-processing',
  'notifications',
  'analytics',
  'imports',
  'exports',
  'cleanup',
] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];
const base = z.object({
  workspaceId: z.string().regex(/^[a-f\d]{24}$/i),
  correlationId: z.string().min(1).max(128),
  idempotencyKey: z.string().min(1).max(200),
  traceparent: z.string().max(512).optional(),
});
const destination = base.extend({
  destination: z.string().min(1).max(500),
  templateId: z.string().max(200).optional(),
  data: z.record(z.string(), z.unknown()).default({}),
});
const resource = base.extend({
  resourceId: z.string().min(1).max(200),
  operation: z.string().min(1).max(100),
  data: z.record(z.string(), z.unknown()).default({}),
});
export const JOB_SCHEMAS: Record<QueueName, z.ZodType> = {
  email: destination,
  sms: destination,
  whatsapp: destination,
  'inbox-delivery': destination,
  'webhook-processing': resource,
  'webhook-delivery': resource,
  'workflow-execution': resource,
  'workflow-resume': resource,
  'campaign-scheduling': resource,
  'campaign-delivery': destination,
  ai: resource,
  embeddings: resource,
  'document-processing': resource,
  'file-processing': resource,
  notifications: destination,
  analytics: resource,
  imports: resource,
  exports: resource,
  cleanup: resource,
};
export type JobPayload = z.infer<typeof base> & Record<string, unknown>;
export function parseJobPayload(queue: QueueName, value: unknown): JobPayload {
  return JOB_SCHEMAS[queue].parse(value) as JobPayload;
}
