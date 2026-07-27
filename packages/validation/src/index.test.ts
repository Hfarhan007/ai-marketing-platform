import { describe, expect, it } from 'vitest';
import { campaignSchema } from './index';

describe('campaignSchema', () => {
  it('accepts a valid campaign', () => {
    expect(campaignSchema.parse({ id: '1', name: 'Launch', status: 'draft' }).name).toBe('Launch');
  });
});
