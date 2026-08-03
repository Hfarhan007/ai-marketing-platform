import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ResponseControlsService } from './response-controls.service.js';
import { parseStructuredJson } from './structured-json.js';

const response = (structured: unknown) => ({ content: JSON.stringify(structured), structured, usage: { inputTokens: 1, outputTokens: 1 } });
const grounded = { classification: 'grounded answer', answer: 'The plan costs $20.', claims: [{ text: 'The plan costs $20.', type: 'retrieved_fact', domain: 'pricing', sourceIds: ['price-1'], confidence: 0.95 }] };

describe('structured output and factuality controls', () => {
  it('repairs only bounded cosmetic JSON defects and rejects malformed JSON', () => {
    expect(parseStructuredJson('```json\n{"ok":true,}\n```')).toEqual({ ok: true });
    expect(() => parseStructuredJson('{ok: true, missing')).toThrow();
    expect(() => parseStructuredJson('x'.repeat(32_769))).toThrow('limit');
  });

  it('enforces Zod, semantic, and business-rule validation', () => {
    const controls = new ResponseControlsService(), contract = z.object({ total: z.number().nonnegative() });
    expect(() => controls.validate(response({ total: '10' }), { contract })).toThrow();
    expect(() => controls.validate(response({ total: 10 }), { contract, semantic: [() => 'meaning is inconsistent'] })).toThrow('Semantic');
    expect(() => controls.validate(response({ total: 10 }), { contract, business: [() => 'price is outside catalog'] })).toThrow('Business-rule');
  });

  it('rejects missing citations and unsupported claims', () => {
    const controls = new ResponseControlsService(), policy = { required: true, rejectUnsupported: true, evidence: [{ sourceId: 'price-1', kind: 'pricing' as const }] };
    expect(() => controls.validate(response({ ...grounded, claims: [{ ...grounded.claims[0], sourceIds: [] }] }), { factuality: policy })).toThrow('missing citations');
    expect(() => controls.validate(response({ ...grounded, claims: [{ ...grounded.claims[0], sourceIds: ['invented'] }] }), { factuality: policy })).toThrow('unsupported');
  });

  it('rejects invented CRM records, prices, policies, and appointments without authoritative evidence', () => {
    const controls = new ResponseControlsService(), claim = { ...grounded.claims[0], text: 'CRM deal fake exists', sourceIds: ['crm-1'], recordIds: ['fake-record'] };
    expect(() => controls.validate(response({ ...grounded, claims: [claim] }), { factuality: { required: true, rejectUnsupported: true, evidence: [{ sourceId: 'crm-1', kind: 'crm' }], knownCrmRecordIds: ['real-record'] } })).toThrow('invented a CRM');
    for (const kind of ['pricing', 'policy', 'appointment'] as const) expect(() => controls.validate(response(grounded), { factuality: { required: true, rejectUnsupported: true, evidence: [{ sourceId: `other-${kind}`, kind }] } })).toThrow('unsupported');
  });

  it('never treats model text as confirmation of fabricated tool success', () => {
    const controls = new ResponseControlsService(), action = response({ classification: 'grounded answer', answer: 'Task created.', claims: [{ text: 'Task created.', type: 'action_result', domain: 'tool', sourceIds: ['tool-1'], confidence: 1, toolCallIndex: 0 }] });
    expect(() => controls.validateToolResults(action, [])).toThrow('cannot confirm');
    expect(() => controls.validateToolResults(action, [{ status: 'failed' }])).toThrow('cannot confirm');
    expect(controls.validateToolResults(action, [{ status: 'created' }]).structured).toEqual(action.structured);
  });

  it('distinguishes suggestions and marks low-confidence facts for human review', () => {
    const controls = new ResponseControlsService(), value = { classification: 'suggestion', answer: 'Maybe offer a call.', claims: [{ text: 'Offer a call', type: 'generated_suggestion', domain: 'general', sourceIds: [], confidence: 0.4 }, { text: 'Policy says review', type: 'retrieved_fact', domain: 'policy', sourceIds: ['policy-1'], confidence: 0.5 }] };
    const validated = controls.validate(response(value), { factuality: { required: true, rejectUnsupported: true, evidence: [{ sourceId: 'policy-1', kind: 'policy' }], requireHumanReviewBelow: 0.7 } });
    expect((validated.structured as { classification: string }).classification).toBe('requires human review');
  });
});
