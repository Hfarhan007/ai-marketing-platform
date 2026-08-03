import { ClassifiedAgentError } from './agent-runtime.types.js';

export interface RecordedModelResponse<T = unknown> {
  runId: string;
  stepKey: string;
  response: T;
}

/** Test provider which never reaches the network and consumes persisted responses in key order. */
export class RecordedModelReplay<T = unknown> {
  private readonly responses: Map<string, T>;
  constructor(records: readonly RecordedModelResponse<T>[]) {
    this.responses = new Map(records.map((record) => [`${record.runId}:${record.stepKey}`, structuredClone(record.response)]));
  }
  complete(runId: string, stepKey: string): Promise<T> {
    const value = this.responses.get(`${runId}:${stepKey}`);
    if (value === undefined) throw new ClassifiedAgentError(`No recorded model response for ${stepKey}`, 'REPLAY_MISS', 'non_retryable');
    return Promise.resolve(structuredClone(value));
  }
}
