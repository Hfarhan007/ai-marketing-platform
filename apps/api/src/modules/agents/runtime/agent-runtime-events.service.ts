import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import type { RuntimeEvents } from './agent-runtime.types.js';

@Injectable()
export class AgentRuntimeEventsService implements RuntimeEvents {
  private readonly emitter = new EventEmitter();
  publish(runId: string, event: { type: string; data?: unknown }) { this.emitter.emit(`run:${runId}`, { runId, occurredAt: new Date().toISOString(), ...event }); }
  subscribe(runId: string, listener: (event: unknown) => void) { this.emitter.on(`run:${runId}`, listener); return () => this.emitter.off(`run:${runId}`, listener); }
}
