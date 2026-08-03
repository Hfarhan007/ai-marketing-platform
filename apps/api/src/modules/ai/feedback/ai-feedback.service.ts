import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PiiRedactionService } from '../safety/pii-redaction.service.js';
import { AiGovernanceRepository } from '../repositories/ai-governance.repository.js';

export const FEEDBACK_REASONS = ['incorrect_fact', 'missing_source', 'unsafe_response', 'bad_tool_action', 'irrelevant_answer', 'poor_tone', 'escalation_required'] as const;
export type FeedbackReason = (typeof FEEDBACK_REASONS)[number];
type Submission = { workspaceId: string; executionId: string; userId: string; userRoles: string[]; kind: 'thumbs_up' | 'thumbs_down'; reasonCodes?: FeedbackReason[]; comment?: string; editedResponse?: string; incorrectFact?: string; inputSnapshot?: string; outputSnapshot?: string };

@Injectable()
export class AiFeedbackService {
  constructor(private readonly repository: AiGovernanceRepository, private readonly pii: PiiRedactionService) {}

  async submit(value: Submission) {
    if (value.kind === 'thumbs_down' && !value.reasonCodes?.length) throw new BadRequestException('Negative feedback requires a reason code');
    const [trace, policy] = await Promise.all([this.repository.executionTrace(value.workspaceId, value.executionId), this.repository.policy(value.workspaceId)]);
    if (!trace) throw new NotFoundException('AI execution not found');
    const rawPermitted = policy?.redactPii === false && (policy.promptRetentionDays ?? 0) > 0;
    const protect = (text?: string | null) => text ? (rawPermitted ? text : this.pii.redact(text)) : null;
    const inputSnapshot = protect(value.inputSnapshot ?? (typeof trace.retainedPrompt === 'string' ? trace.retainedPrompt : null));
    const outputSnapshot = protect(value.outputSnapshot);
    const reasonCodes = [...new Set(value.reasonCodes ?? [])].sort();
    const deduplicationKey = createHash('sha256').update(JSON.stringify({ executionId: value.executionId, userId: value.userId, kind: value.kind, reasonCodes, editedResponse: protect(value.editedResponse), incorrectFact: protect(value.incorrectFact) })).digest('hex');
    return this.repository.submitFeedback({ workspaceId: value.workspaceId, requestId: value.executionId, executionId: value.executionId, userId: value.userId, kind: value.kind, reasonCodes, comment: protect(value.comment), commentHash: value.comment ? createHash('sha256').update(value.comment).digest('hex') : null, editedResponse: protect(value.editedResponse), incorrectFact: protect(value.incorrectFact), promptVersion: trace.promptVersion ?? null, provider: trace.provider ?? null, model: trace.model ?? null, retrievedSources: Array.isArray(trace.retrievalSources) ? trace.retrievalSources : [], toolCalls: Array.isArray(trace.toolCalls) ? trace.toolCalls : [], safetyDecisions: Array.isArray(trace.safetyInterventions) ? trace.safetyInterventions : [], userRoles: value.userRoles, inputSnapshot, outputSnapshot, rawSnapshotPolicyPermitted: rawPermitted, reviewerQueue: this.reviewerQueueFor(reasonCodes), status: 'unresolved', deduplicationKey });
  }

  queue(workspaceId: string, reviewerQueue: string, status = 'unresolved', limit = 50) { return this.repository.reviewerQueue(workspaceId, reviewerQueue, status, limit); }
  claim(workspaceId: string, feedbackId: string, reviewerId: string) { return this.repository.claimFeedback(workspaceId, feedbackId, reviewerId); }

  async adjudicate(input: { workspaceId: string; feedbackId: string; reviewerId: string; decision: 'approved' | 'rejected' | 'needs_more_information'; notes?: string }) {
    const feedback = await this.repository.adjudicateFeedback(input.workspaceId, input.feedbackId, input.reviewerId, input.decision, input.notes ? this.pii.redact(input.notes) : null);
    if (!feedback) throw new NotFoundException('Feedback not found or already adjudicated');
    if (input.decision !== 'approved') return { feedback, evaluationCase: null };
    const expectedOutput = feedback.editedResponse ?? (feedback.kind === 'thumbs_up' ? feedback.outputSnapshot : null);
    if (!feedback.inputSnapshot || !expectedOutput) return { feedback, evaluationCase: null };
    const evaluationCase = await this.repository.createFeedbackCase({ workspaceId: input.workspaceId, feedbackId: feedback._id, input: feedback.inputSnapshot, expectedOutput, expectedSourceIds: feedback.retrievedSources, expectedTools: feedback.toolCalls, promptVersion: feedback.promptVersion, provider: feedback.provider, model: feedback.model, origin: 'approved_feedback' });
    return { feedback, evaluationCase };
  }

  async compareAndAlert(workspaceId: string, since: Date, negativeRateThreshold: number) {
    if (negativeRateThreshold <= 0 || negativeRateThreshold > 1) throw new BadRequestException('Invalid regression threshold');
    const comparisons = await this.repository.compareFeedback(workspaceId, since), alerts = [];
    for (const group of comparisons) {
      const rate = group.total ? group.negative / group.total : 0;
      if (rate >= negativeRateThreshold) alerts.push(await this.repository.regressionAlert({ workspaceId, dimension: 'negative_feedback_rate', candidate: `${group.provider ?? 'unknown'}:${group.model ?? 'unknown'}:${group.promptVersion ?? 'unknown'}`, observedRate: rate, threshold: negativeRateThreshold }));
    }
    return { comparisons: comparisons.map((group) => ({ ...group, negativeRate: group.total ? group.negative / group.total : 0 })), alerts };
  }

  private reviewerQueueFor(reasons: FeedbackReason[]) {
    if (reasons.includes('unsafe_response')) return 'safety';
    if (reasons.some((reason) => ['incorrect_fact', 'missing_source'].includes(reason))) return 'factuality';
    if (reasons.includes('bad_tool_action')) return 'tooling';
    if (reasons.includes('escalation_required')) return 'escalation';
    return 'quality';
  }
}
