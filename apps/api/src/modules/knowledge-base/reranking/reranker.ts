import type { VectorHit } from '../vector-search/vector-search.types.js';
export interface Reranker { rerank(query: string, hits: VectorHit[]): Promise<VectorHit[]> }
export const RERANKER = Symbol('RERANKER');
export class ScoreOnlyReranker implements Reranker {
  rerank(_query: string, hits: VectorHit[]) { return Promise.resolve([...hits].sort((a, b) => b.score - a.score)); }
}
