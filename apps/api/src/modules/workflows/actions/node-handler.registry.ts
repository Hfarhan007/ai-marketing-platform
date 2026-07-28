import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  ExecutionContext,
  NodeResult,
  WorkflowNode,
  WorkflowNodeType,
} from '../types/workflow.types.js';
type Handler = (node: WorkflowNode, context: ExecutionContext) => Promise<NodeResult>;
const done = (value: NodeResult): Promise<NodeResult> => Promise.resolve(value);
@Injectable()
export class NodeHandlerRegistry {
  private readonly handlers = new Map<WorkflowNodeType, Handler>();
  constructor() {
    const complete: Handler = (node) =>
      done({ state: 'completed', output: { action: node.type, accepted: true } });
    const immediate: WorkflowNodeType[] = [
      'contact.created',
      'lead.created',
      'form.submitted',
      'message.received',
      'appointment.booked',
      'deal.stage_changed',
      'trigger.schedule',
      'trigger.webhook',
      'trigger.manual',
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
    ];
    for (const type of immediate) this.handlers.set(type, complete);
    this.handlers.set('delay', (node) =>
      done({ state: 'waiting', resumeAt: new Date(Date.now() + Number(node.config.durationMs)) }),
    );
    this.handlers.set('wait.until', (node) =>
      done({ state: 'waiting', resumeAt: new Date(String(node.config.timestamp)) }),
    );
    this.handlers.set('condition', (node, context) =>
      done({
        state: 'completed',
        nextBranch: context.variables[String(node.config.variable)] ? 'true' : 'false',
      }),
    );
    this.handlers.set('branch', (node, context) => {
      const selected = context.variables[String(node.config.variable)];
      const fallback =
        typeof node.config.defaultBranch === 'string' ? node.config.defaultBranch : 'default';
      return done({
        state: 'completed',
        nextBranch: typeof selected === 'string' ? selected : fallback,
      });
    });
    this.handlers.set('loop', (node, context) => {
      const key = `loop:${node.id}`,
        count = Number(context.variables[key] ?? 0) + 1;
      context.variables[key] = count;
      return done({
        state: 'completed',
        nextBranch: count < Number(node.config.maxIterations) ? 'continue' : 'done',
        output: { iteration: count },
      });
    });
    this.handlers.set('terminate', () => done({ state: 'terminated' }));
  }
  execute(node: WorkflowNode, context: ExecutionContext) {
    const handler = this.handlers.get(node.type);
    if (!handler) throw new BadRequestException(`No handler for ${node.type}`);
    return handler(node, context);
  }
}
