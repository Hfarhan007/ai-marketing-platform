import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, PipelineStage } from 'mongoose';
import { Types } from 'mongoose';
import { vectorIndexName } from '../../../database/indexes/vector-index-definitions.js';
import { KnowledgeChunk } from '../schemas/rag.schemas.js';
import type {
  VectorFilters,
  VectorHit,
  VectorSearchAdapter,
} from '../vector-search/vector-search.types.js';

export function assertWorkspaceVectorFilter(
  filter: Record<string, unknown>,
  trustedWorkspaceId: string,
) {
  if (!trustedWorkspaceId || !Types.ObjectId.isValid(trustedWorkspaceId))
    throw new BadRequestException('A valid workspace is required for vector search');
  const value = filter.workspaceId;
  if (!(value instanceof Types.ObjectId) || value.toHexString() !== trustedWorkspaceId)
    throw new Error('Unfiltered or mismatched workspace vector search rejected');
}

@Injectable()
export class AtlasVectorSearchAdapter implements VectorSearchAdapter {
  constructor(
    @InjectModel(KnowledgeChunk.name) private readonly chunks: Model<KnowledgeChunk>,
    private readonly config: ConfigService,
  ) {}

  async search(
    workspaceId: string,
    vector: number[],
    filters: VectorFilters,
    limit: number,
  ): Promise<VectorHit[]> {
    const environment = this.config.get<string>('app.environment') ?? 'development';
    const active = vectorIndexName(
      environment,
      this.config.get<string>('database.vectorIndexVersion') ?? 'v1',
    );
    const primary = await this.query(active, workspaceId, vector, filters, limit);
    if (this.config.get<boolean>('database.vectorDualRead')) {
      const candidateVersion = this.config.get<string>('database.vectorCandidateVersion');
      if (!candidateVersion)
        throw new Error('Dual-read vector search requires a candidate index version');
      const candidate = await this.query(
        vectorIndexName(environment, candidateVersion),
        workspaceId,
        vector,
        filters,
        limit,
      );
      // The active result remains authoritative. Candidate execution validates tenant isolation and query compatibility.
      this.assertResults(workspaceId, candidate);
    }
    return primary;
  }

  buildPipeline(
    index: string,
    workspaceId: string,
    vector: number[],
    filters: VectorFilters,
    limit: number,
  ): PipelineStage[] {
    if (!Types.ObjectId.isValid(workspaceId))
      throw new BadRequestException('A valid workspace is required for vector search');
    const filter: Record<string, unknown> = {
      workspaceId: new Types.ObjectId(workspaceId),
      status: filters.status ?? 'active',
    };
    if (filters.collectionIds?.length) filter.collectionIds = { $in: filters.collectionIds };
    if (filters.sourceIds?.length)
      filter.sourceId = { $in: filters.sourceIds.map((id) => new Types.ObjectId(id)) };
    if (filters.documentIds?.length)
      filter.documentId = { $in: filters.documentIds.map((id) => new Types.ObjectId(id)) };
    if (filters.language) filter.language = filters.language;
    if (filters.accessControlGroups?.length)
      filter['accessControl.groups'] = { $in: filters.accessControlGroups };
    if (filters.contentType) filter['metadata.contentType'] = filters.contentType;
    if (filters.createdAfter || filters.createdBefore)
      filter.createdAt = {
        ...(filters.createdAfter ? { $gte: filters.createdAfter } : {}),
        ...(filters.createdBefore ? { $lte: filters.createdBefore } : {}),
      };
    for (const [key, value] of Object.entries(filters.metadata ?? {}))
      filter[`metadata.${key}`] = value;
    assertWorkspaceVectorFilter(filter, workspaceId);
    return [
      {
        $vectorSearch: {
          index,
          path: 'embedding',
          queryVector: vector,
          numCandidates: Math.min(Math.max(limit * 20, 100), 1000),
          limit: Math.min(limit, 50),
          filter,
        },
      },
      {
        $project: {
          workspaceId: 1,
          sourceId: 1,
          documentId: 1,
          collectionIds: 1,
          language: 1,
          status: 1,
          text: 1,
          metadata: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];
  }

  private async query(
    index: string,
    workspaceId: string,
    vector: number[],
    filters: VectorFilters,
    limit: number,
  ) {
    const values = await this.chunks
      .aggregate<VectorHit>(this.buildPipeline(index, workspaceId, vector, filters, limit))
      .exec();
    this.assertResults(workspaceId, values);
    return values;
  }
  private assertResults(workspaceId: string, values: VectorHit[]) {
    if (values.some((value) => String(value.workspaceId) !== workspaceId))
      throw new Error('Cross-tenant vector result rejected');
  }
}
