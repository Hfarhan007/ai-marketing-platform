import { Injectable } from '@nestjs/common';
import type { VectorHit } from '../vector-search/vector-search.types.js';
@Injectable()
export class CitationService {
  create(hits: VectorHit[]) {
    return hits.map((hit, index) => ({
      marker: `[${index + 1}]`,
      sourceId: String(hit.sourceId),
      documentId: String(hit.documentId),
      chunkId: String(hit.id),
      title: typeof hit.metadata.title === 'string' ? hit.metadata.title : 'Knowledge source',
      score: hit.score,
    }));
  }
}
