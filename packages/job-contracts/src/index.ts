import { z } from 'zod';

export const JOB_CONTRACT_VERSION = 1 as const;
export const QUEUE_NAMES = [
  'email', 'sms', 'whatsapp', 'inbox-delivery', 'webhook-processing', 'webhook-delivery',
  'workflow-execution', 'workflow-resume', 'campaign-scheduling', 'campaign-delivery', 'ai',
  'embeddings', 'document-processing', 'file-processing', 'notifications', 'analytics',
  'contact-imports', 'data-exports', 'cleanup',
] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];
export const JOB_NAMES = { contactImportRequested: 'contacts.import.requested' } as const;

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
export const jobEnvelopeSchema = z.object({
  jobVersion: z.literal(JOB_CONTRACT_VERSION),
  jobId: z.string().min(1).max(200),
  workspaceId: objectId,
  correlationId: z.string().min(1).max(128),
  causationId: z.string().min(1).max(200),
  actorId: objectId.optional(),
  idempotencyKey: z.string().min(1).max(200),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime({ offset: true }),
  deadline: z.string().datetime({ offset: true }).optional(),
  traceparent: z.string().max(512).optional(),
});
export type JobEnvelope<T extends Record<string, unknown> = Record<string, unknown>> = Omit<z.infer<typeof jobEnvelopeSchema>, 'payload'> & { payload: T };

export const contactImportPayloadSchema = z.object({
  transferJobId: objectId,
  entity: z.literal('contacts'),
  fileId: objectId,
  storageKey: z.string().min(1).max(1024),
  format: z.enum(['csv', 'xlsx', 'json']),
  mapping: z.record(z.string(), z.string()),
  duplicatePolicy: z.enum(['skip', 'update', 'merge', 'create_new']),
  dryRun: z.boolean(),
});
export type ContactImportPayload = z.infer<typeof contactImportPayloadSchema>;
export const contactImportJobSchema = jobEnvelopeSchema.extend({ payload: contactImportPayloadSchema });
export type ContactImportJob = z.infer<typeof contactImportJobSchema>;

export const queueJobSchemas: Record<QueueName, z.ZodType> = Object.fromEntries(
  QUEUE_NAMES.map((name) => [name, jobEnvelopeSchema]),
) as unknown as Record<QueueName, z.ZodType>;
queueJobSchemas['contact-imports'] = contactImportJobSchema;

export function parseJobEnvelope(queue: QueueName, value: unknown): JobEnvelope {
  return queueJobSchemas[queue].parse(value) as JobEnvelope;
}
export const DEFAULT_RETRY_POLICY = { attempts: 5, backoff: { type: 'exponential' as const, delay: 2_000 } } as const;
