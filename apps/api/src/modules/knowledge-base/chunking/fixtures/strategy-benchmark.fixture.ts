import type { ChunkingStrategy } from '../chunking.service.js';

export interface ChunkingBenchmarkFixture {
  name: string;
  content: string;
  strategies: ChunkingStrategy[];
  expectedAtomicText: string[];
}

/** Stable corpus used to compare chunk counts, boundary reasons, and atomic-unit preservation. */
export const STRATEGY_BENCHMARK_FIXTURES: ChunkingBenchmarkFixture[] = [
  {
    name: 'structured-support-guide',
    content:
      '# Billing\nInvoices are issued monthly. They remain available online.\n\n| Plan | Price |\n| --- | --- |\n| Pro | $20 |\n\n# Refunds\nRefunds take five days.',
    strategies: [
      'fixed-token',
      'paragraph',
      'heading-aware',
      'sentence-aware',
      'table-aware',
      'semantic-boundary',
    ],
    expectedAtomicText: ['| Plan | Price |\n| --- | --- |\n| Pro | $20 |'],
  },
  {
    name: 'support-faq',
    content:
      'Q: How do I reset my password?\nA: Open Settings, then choose Reset password.\n\nQ: کیا اردو دستیاب ہے؟\nA: جی ہاں، اردو دستیاب ہے۔',
    strategies: ['paragraph', 'faq-pair', 'semantic-boundary'],
    expectedAtomicText: [
      'Q: How do I reset my password?\nA: Open Settings, then choose Reset password.',
    ],
  },
  {
    name: 'meeting-transcript',
    content: '[00:01] Aisha: Welcome everyone.\n[00:08] Omar: Let us review the campaign.',
    strategies: ['sentence-aware', 'transcript-segment', 'sliding-window'],
    expectedAtomicText: ['[00:01] Aisha: Welcome everyone.'],
  },
];
