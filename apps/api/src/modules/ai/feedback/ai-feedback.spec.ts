import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { PiiRedactionService } from '../safety/pii-redaction.service.js';
import { AiFeedbackService } from './ai-feedback.service.js';

const workspaceId = new Types.ObjectId().toHexString(), userId = new Types.ObjectId().toHexString(), feedbackId = new Types.ObjectId();
function setup(policy: { redactPii: boolean; promptRetentionDays: number } = { redactPii: true, promptRetentionDays: 0 }) {
  const repository = {
    executionTrace: vi.fn().mockResolvedValue({ requestId: 'run-1', promptVersion: 'v2', provider: 'openai', model: 'gpt', retrievalSources: ['source-1'], toolCalls: ['contact_lookup'], safetyInterventions: ['pii_redacted'], retainedPrompt: 'Contact jane@example.com' }),
    policy: vi.fn().mockResolvedValue(policy), submitFeedback: vi.fn().mockImplementation((value) => Promise.resolve(value)),
    adjudicateFeedback: vi.fn(), createFeedbackCase: vi.fn().mockImplementation((value) => Promise.resolve(value)), reviewerQueue: vi.fn(), claimFeedback: vi.fn(), compareFeedback: vi.fn(), regressionAlert: vi.fn(),
  };
  return { repository, service: new AiFeedbackService(repository as never, new PiiRedactionService()) };
}

describe('AI feedback governance', () => {
  it('redacts feedback snapshots and sensitive corrections by default', async () => {
    const { service, repository } = setup();
    await service.submit({ workspaceId, executionId: 'run-1', userId, userRoles: ['agent'], kind: 'thumbs_down', reasonCodes: ['incorrect_fact'], editedResponse: 'Email jane@example.com', incorrectFact: 'Phone +1 555 123 4567', outputSnapshot: 'Token token-abcdefghijklmnop' });
    expect(repository.submitFeedback).toHaveBeenCalledWith(expect.objectContaining({ inputSnapshot: 'Contact [EMAIL]', editedResponse: 'Email [EMAIL]', incorrectFact: 'Phone [PHONE]', outputSnapshot: 'Token [SECRET]', rawSnapshotPolicyPermitted: false, promptVersion: 'v2', provider: 'openai', model: 'gpt', retrievedSources: ['source-1'], toolCalls: ['contact_lookup'], safetyDecisions: ['pii_redacted'], reviewerQueue: 'factuality' }));
  });

  it('deduplicates equivalent feedback with a stable key', async () => {
    const { service, repository } = setup(), submission = { workspaceId, executionId: 'run-1', userId, userRoles: ['agent'], kind: 'thumbs_down' as const, reasonCodes: ['poor_tone' as const], comment: 'Too terse' };
    await service.submit(submission); await service.submit(submission);
    const first = repository.submitFeedback.mock.calls[0]![0] as { deduplicationKey: string }, second = repository.submitFeedback.mock.calls[1]![0] as { deduplicationKey: string };
    expect(first.deduplicationKey).toBe(second.deduplicationKey);
  });

  it('creates evaluation cases only from adjudicated approved feedback', async () => {
    const { service, repository } = setup();
    repository.adjudicateFeedback.mockResolvedValue({ _id: feedbackId, kind: 'thumbs_down', editedResponse: 'Correct answer', inputSnapshot: 'Question', outputSnapshot: 'Wrong answer', retrievedSources: ['source-1'], toolCalls: ['contact_lookup'], promptVersion: 'v2', provider: 'openai', model: 'gpt' });
    expect(repository.createFeedbackCase).not.toHaveBeenCalled();
    const result = await service.adjudicate({ workspaceId, feedbackId: feedbackId.toHexString(), reviewerId: userId, decision: 'approved' });
    expect(result.evaluationCase).toBeTruthy();
    expect(repository.createFeedbackCase).toHaveBeenCalledWith({ workspaceId, feedbackId, input: 'Question', expectedOutput: 'Correct answer', expectedSourceIds: ['source-1'], expectedTools: ['contact_lookup'], promptVersion: 'v2', provider: 'openai', model: 'gpt', origin: 'approved_feedback' });
  });

  it('does not create a dataset from rejected or incomplete feedback', async () => {
    const { service, repository } = setup();
    repository.adjudicateFeedback.mockResolvedValue({ _id: feedbackId, kind: 'thumbs_down', editedResponse: null, inputSnapshot: 'Question', outputSnapshot: 'Wrong' });
    await expect(service.adjudicate({ workspaceId, feedbackId: feedbackId.toHexString(), reviewerId: userId, decision: 'rejected' })).resolves.toMatchObject({ evaluationCase: null });
    expect(repository.createFeedbackCase).not.toHaveBeenCalled();
  });
});
