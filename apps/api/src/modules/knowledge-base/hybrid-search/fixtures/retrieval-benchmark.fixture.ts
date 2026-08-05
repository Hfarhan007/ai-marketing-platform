import type { RetrievalMode } from '../rag-retrieval.service.js';

export const RETRIEVAL_BENCHMARKS: Array<{
  name: string;
  mode: RetrievalMode;
  expectKeyword: boolean;
  expectVector: boolean;
}> = [
  {
    name: 'exact product code keyword lookup',
    mode: 'keyword',
    expectKeyword: true,
    expectVector: false,
  },
  {
    name: 'conceptual similarity vector lookup',
    mode: 'vector',
    expectKeyword: false,
    expectVector: true,
  },
  {
    name: 'mixed natural-language lookup',
    mode: 'hybrid',
    expectKeyword: true,
    expectVector: true,
  },
];
