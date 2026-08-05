import type {
  VectorCandidate,
  VectorFilters,
  VectorHit,
  VectorSearchAdapter,
} from './vector-search.types.js';

/** Test/development fallback only. O(n), memory-bound, and intentionally capped. Not production scalable. */
export class InMemoryVectorSearchAdapter implements VectorSearchAdapter {
  constructor(
    private readonly values: VectorCandidate[],
    private readonly maximumRecords = 5_000,
  ) {
    if (values.length > maximumRecords)
      throw new Error('In-memory vector adapter dataset limit exceeded');
  }
  search(
    workspaceId: string,
    vector: number[],
    filters: VectorFilters,
    limit: number,
  ): Promise<VectorHit[]> {
    return Promise.resolve(
      this.values
        .filter(
          (item) =>
            item.workspaceId === workspaceId &&
            item.status === 'active' &&
            this.allowed(item, filters) &&
            (!filters.language || item.language === filters.language) &&
            (!filters.collectionIds?.length ||
              filters.collectionIds.some((id) => item.collectionIds.includes(id))) &&
            (!filters.sourceIds?.length || filters.sourceIds.includes(item.sourceId)) &&
            Object.entries(filters.metadata ?? {}).every(
              ([key, value]) => item.metadata[key] === value,
            ),
        )
        .map(({ embedding, ...item }) => ({ ...item, score: this.cosine(vector, embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(limit, 50)),
    );
  }
  private allowed(item: VectorCandidate, filters: VectorFilters) {
    const visibility = item.accessControl?.visibility ?? 'workspace';
    return (
      visibility === 'workspace' ||
      visibility === 'public' ||
      Boolean(
        filters.accessControlUserId &&
        item.accessControl?.userIds?.includes(filters.accessControlUserId),
      ) ||
      Boolean(
        filters.accessControlGroups?.some((group) => item.accessControl?.groups?.includes(group)),
      )
    );
  }
  private cosine(a: number[], b: number[]) {
    if (a.length !== b.length || !a.length) return 0;
    let dot = 0,
      aa = 0,
      bb = 0;
    for (let index = 0; index < a.length; index++) {
      dot += (a[index] ?? 0) * (b[index] ?? 0);
      aa += (a[index] ?? 0) ** 2;
      bb += (b[index] ?? 0) ** 2;
    }
    return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
  }
}
