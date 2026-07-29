import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, PipelineStage } from 'mongoose';
import { Types } from 'mongoose';
import { KnowledgeChunk } from '../schemas/rag.schemas.js';
import type { VectorFilters, VectorHit, VectorSearchAdapter } from '../vector-search/vector-search.types.js';

@Injectable()
export class AtlasVectorSearchAdapter implements VectorSearchAdapter {
  constructor(@InjectModel(KnowledgeChunk.name) private readonly chunks: Model<KnowledgeChunk>) {}
  async search(workspaceId: string, vector: number[], filters: VectorFilters, limit: number): Promise<VectorHit[]> {
    const filter: Record<string, unknown> = { workspaceId: new Types.ObjectId(workspaceId), status: 'active' };
    if (filters.collectionIds?.length) filter.collectionIds = { $in: filters.collectionIds };
    if (filters.sourceIds?.length) filter.sourceId = { $in: filters.sourceIds.map((id) => new Types.ObjectId(id)) };
    if (filters.language) filter.language = filters.language;
    for (const [key, value] of Object.entries(filters.metadata ?? {})) filter[`metadata.${key}`] = value;
    const pipeline: PipelineStage[] = [
      { $vectorSearch: { index: 'knowledge_chunks_vector', path: 'embedding', queryVector: vector, numCandidates: Math.min(Math.max(limit * 20, 100), 1000), limit: Math.min(limit, 50), filter } },
      { $project: { workspaceId: 1, sourceId: 1, documentId: 1, collectionIds: 1, language: 1, status: 1, text: 1, metadata: 1, score: { $meta: 'vectorSearchScore' } } },
    ];
    const values = await this.chunks.aggregate<VectorHit>(pipeline).exec();
    if (values.some((value) => String(value.workspaceId) !== workspaceId)) throw new Error('Cross-tenant vector result rejected');
    return values;
  }
}
