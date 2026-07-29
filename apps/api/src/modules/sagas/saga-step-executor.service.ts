import { Injectable } from '@nestjs/common';
import { OutboxService } from '../../events/outbox.service.js';
import type { Saga } from './schemas/saga.schema.js';
import type { SagaStepDefinition, SagaStepResult } from './saga.types.js';

@Injectable()
export class SagaStepExecutor {
  constructor(private readonly outbox: OutboxService) {}

  async execute(
    saga: Saga,
    step: SagaStepDefinition,
    compensation: boolean,
  ): Promise<SagaStepResult> {
    const command = compensation ? step.compensation?.command : step.command;
    if (!command) return { outcome: 'completed' };
    const operation = compensation ? `compensate:${step.name}` : step.name;
    const eventId = `saga:${String(saga._id)}:${operation}`;
    try {
      await this.outbox.append({
        eventId,
        eventType: command,
        aggregateType: 'saga',
        aggregateId: String(saga._id),
        workspaceId: String(saga.workspaceId),
        payload: {
          ...saga.payload,
          sagaId: String(saga._id),
          sagaType: saga.type,
          step: step.name,
          compensation,
          idempotencyKey: eventId,
        },
        metadata: { orchestrated: true },
        correlationId: saga.correlationId,
      });
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 11_000))
        throw error;
    }
    return { outcome: 'waiting', externalReference: eventId };
  }
}
