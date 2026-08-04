export interface VectorFilters {
  collectionIds?: string[];
  sourceIds?: string[];
  documentIds?: string[];
  language?: string;
  status?: string;
  accessControlGroups?: string[];
  contentType?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  metadata?: Record<string, string | number | boolean>;
}
export interface VectorCandidate {
  id: string;
  workspaceId: string;
  sourceId: string;
  documentId: string;
  collectionIds: string[];
  language: string;
  status: string;
  text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}
export interface VectorHit extends Omit<VectorCandidate, 'embedding'> {
  score: number;
}
export interface VectorSearchAdapter {
  search(
    workspaceId: string,
    vector: number[],
    filters: VectorFilters,
    limit: number,
  ): Promise<VectorHit[]>;
}
export const VECTOR_SEARCH_ADAPTER = Symbol('VECTOR_SEARCH_ADAPTER');
