import type { Queue } from 'bullmq';
import { createConnection, Types, type Connection, type Model } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SAGA_DEFINITIONS } from '../src/modules/sagas/saga-definitions.js';
import { SagaRepository } from '../src/modules/sagas/repositories/saga.repository.js';
import {
  Saga,
  SagaAlert,
  SagaAlertSchema,
  SagaSchema,
} from '../src/modules/sagas/schemas/saga.schema.js';
import { SagaService } from '../src/modules/sagas/saga.service.js';
import type { SagaStepExecutor } from '../src/modules/sagas/saga-step-executor.service.js';
import type { SagaJob, SagaStepDefinition } from '../src/modules/sagas/saga.types.js';

const integrationUri = process.env.MONGODB_INTEGRATION_URI ?? '';
const describeWithMongo = integrationUri ? describe : describe.skip;

describeWithMongo('durable saga orchestration (integration)', () => {
  let connection!: Connection;
  let sagas!: Model<Saga>;
  let alerts!: Model<SagaAlert>;

  beforeAll(async () => {
    connection = await createConnection(integrationUri, {
      dbName: `ai_marketing_sagas_${Date.now()}`,
      serverSelectionTimeoutMS: 5_000,
    }).asPromise();
    sagas = connection.model(Saga.name, SagaSchema);
    alerts = connection.model(SagaAlert.name, SagaAlertSchema);
    await Promise.all([sagas.createCollection(), alerts.createCollection()]);
    await Promise.all([sagas.createIndexes(), alerts.createIndexes()]);
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  });

  for (const definition of SAGA_DEFINITIONS) {
    for (const [failedIndex, failedStep] of definition.steps.entries()) {
      it(`${definition.type}: persists failure and recovery at ${failedStep.name}`, async () => {
        const workspaceId = new Types.ObjectId().toHexString();
        const repository = new SagaRepository(sagas, alerts);
        const queueJobs: Array<{ data: SagaJob; delay: number }> = [];
        const queue = {
          add: (_name: string, data: SagaJob, options: { delay?: number }) => {
            queueJobs.push({ data, delay: options.delay ?? 0 });
            return Promise.resolve({});
          },
        } as Queue<SagaJob>;
        const executor = {
          execute: (_saga: Saga, step: SagaStepDefinition) => {
            if (step.name === failedStep.name)
              return Promise.reject(new Error(`injected:${step.name}`));
            return Promise.resolve({ outcome: 'completed' as const });
          },
        } as SagaStepExecutor;
        const service = new SagaService(repository, executor, queue);
        const started = await service.start({
          workspaceId,
          type: definition.type,
          correlationId: `${definition.type}:${failedStep.name}`,
        });
        let state = started.saga;

        for (let index = 0; index < failedIndex; index += 1)
          state = await service.advance(workspaceId, String(state._id));
        for (let attempt = 0; attempt < failedStep.maxAttempts; attempt += 1) {
          if (attempt)
            await sagas.updateOne(
              { _id: state._id },
              { $set: { nextAttemptAt: new Date(Date.now() - 1) } },
            );
          state = await service.advance(workspaceId, String(state._id));
        }

        const persisted = await sagas.findById(state._id).lean<Saga>().exec();
        expect(persisted).toBeTruthy();
        expect(persisted?.stepAttempts[failedStep.name]).toBe(failedStep.maxAttempts);
        expect(persisted?.lastError).toContain(`injected:${failedStep.name}`);
        expect(
          persisted?.auditHistory.some(
            (entry) => entry.action === 'step_started' && entry.step === failedStep.name,
          ),
        ).toBe(true);

        const reversiblePredecessor = definition.steps
          .slice(0, failedIndex)
          .some((step) => Boolean(step.compensation));
        expect(persisted?.status).toBe(
          reversiblePredecessor ? 'compensating' : 'manual_intervention',
        );
        expect(queueJobs.length).toBeGreaterThan(0);
      });
    }
  }

  it('deduplicates starts by workspace and correlation ID', async () => {
    const repository = new SagaRepository(sagas, alerts);
    const queue = { add: () => Promise.resolve({}) } as Queue<SagaJob>;
    const executor = {
      execute: () => Promise.resolve({ outcome: 'completed' as const }),
    } as SagaStepExecutor;
    const service = new SagaService(repository, executor, queue);
    const input = {
      workspaceId: new Types.ObjectId().toHexString(),
      type: 'lead_conversion' as const,
      correlationId: 'same-business-operation',
    };
    const first = await service.start(input);
    const second = await service.start(input);
    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(String(second.saga._id)).toBe(String(first.saga._id));
  });
});
