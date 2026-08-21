import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Types, type Connection } from 'mongoose';
import { PinoLogger } from 'nestjs-pino';
import type { WorkspaceRequestContext } from '../../common/types/workspace-context.js';
import { PolicyService } from '../permissions/services/policy.service.js';
import { FilterCompiler } from './filter-compiler.service.js';
import { SEARCH_INDEX_RECOMMENDATIONS } from './index-recommendations.js';
import { SearchMetrics } from './search-metrics.service.js';
import { SEARCH_SCHEMAS } from './search.schemas.js';
import type { SearchEntity, SearchRequest } from './search.types.js';

const ENTITY_PERMISSION = {
  contacts: 'contacts.read',
  companies: 'companies.read',
  leads: 'leads.read',
  deals: 'deals.read',
  tasks: 'tasks.read',
  conversations: 'inbox.read',
  campaigns: 'campaigns.read',
  workflows: 'workflows.read',
  appointments: 'appointments.read',
  files: 'files.read',
} as const;
@Injectable()
export class SearchService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly compiler: FilterCompiler,
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
    private readonly metrics: SearchMetrics,
    private readonly policy: PolicyService,
  ) {
    this.logger.setContext(SearchService.name);
  }
  async search(context: WorkspaceRequestContext, entity: SearchEntity, request: SearchRequest) {
    const ability = await this.policy.ability(context);
    if (!this.policy.has(ability, ENTITY_PERMISSION[entity]))
      throw new ForbiddenException('SEARCH_ENTITY_FORBIDDEN');
    const schema = SEARCH_SCHEMAS[entity];
    const maximum = request.export ? 5000 : 500;
    const limit = Math.min(request.limit ?? 50, maximum);
    if (request.limit && request.limit > maximum)
      throw new BadRequestException(
        request.export ? 'SEARCH_EXPORT_LIMIT_EXCEEDED' : 'SEARCH_RESULT_LIMIT_EXCEEDED',
      );
    const sortField = request.sort?.field ?? 'createdAt';
    if (!schema.sortable.has(sortField)) throw new BadRequestException('SEARCH_SORT_FIELD_INVALID');
    const direction = request.sort?.direction ?? 'desc';
    if (!['asc', 'desc'].includes(direction))
      throw new BadRequestException('SEARCH_SORT_DIRECTION_INVALID');
    const filter = this.compiler.compile(entity, request.filter, context.workspaceId);
    const cursor = request.cursor ? this.decodeCursor(request.cursor, sortField) : null;
    const cursorFilter = cursor
      ? this.cursorFilter(sortField, direction, cursor.value, cursor.id)
      : null;
    const finalFilter = cursorFilter ? { $and: [filter, cursorFilter] } : filter;
    const started = performance.now();
    const database = this.connection.db;
    if (!database) throw new Error('MongoDB connection unavailable');
    const useAtlas = this.config.get<boolean>('MONGODB_ATLAS_SEARCH_ENABLED') === true;
    const pipeline: Record<string, unknown>[] = [];
    if (request.text?.trim() && useAtlas) {
      pipeline.push({
        $search: {
          index: schema.atlasIndex,
          compound: {
            must: [
              {
                text: {
                  query: request.text.trim(),
                  path: schema.textFields,
                  fuzzy: { maxEdits: 1 },
                },
              },
            ],
            filter: [
              { equals: { path: 'workspaceId', value: new Types.ObjectId(context.workspaceId) } },
            ],
          },
        },
      });
    }
    const effectiveFilter =
      request.text?.trim() && !useAtlas
        ? {
            $and: [
              finalFilter,
              {
                $or: schema.textFields.map((field) => ({
                  [field]: { $regex: this.escape(request.text!.trim()), $options: 'i' },
                })),
              },
            ],
          }
        : finalFilter;
    pipeline.push(
      { $match: effectiveFilter },
      { $sort: { [sortField]: direction === 'asc' ? 1 : -1, _id: direction === 'asc' ? 1 : -1 } },
      { $limit: limit + 1 },
    );
    const values = await database
      .collection(schema.collection)
      .aggregate(pipeline, { maxTimeMS: request.export ? 30_000 : 5_000 })
      .toArray();
    const durationMs = performance.now() - started,
      slow = durationMs >= 250;
    this.metrics.observe(entity, durationMs, slow);
    if (slow)
      this.logger.warn(
        {
          entity,
          durationMs,
          conditionCount: this.conditionCount(request.filter),
          sortField,
          atlas: useAtlas,
          export: request.export === true,
        },
        'slow MongoDB search query',
      );
    const hasMore = values.length > limit;
    if (hasMore) values.pop();
    const last = values.at(-1);
    return {
      items: values,
      nextCursor: hasMore && last ? this.encodeCursor(sortField, last[sortField], last._id) : null,
      limit,
      searchMode: request.text?.trim() ? (useAtlas ? 'atlas' : 'mongodb-fallback') : 'filter',
    };
  }
  recommendations(entity?: SearchEntity) {
    return entity
      ? SEARCH_INDEX_RECOMMENDATIONS.filter((value) => value.entity === entity)
      : SEARCH_INDEX_RECOMMENDATIONS;
  }
  metricSnapshot() {
    return this.metrics.snapshot();
  }
  private cursorFilter(
    field: string,
    direction: 'asc' | 'desc',
    value: unknown,
    id: Types.ObjectId,
  ) {
    const operator = direction === 'asc' ? '$gt' : '$lt';
    return {
      $or: [{ [field]: { [operator]: value } }, { [field]: value, _id: { [operator]: id } }],
    };
  }
  private encodeCursor(field: string, value: unknown, id: unknown) {
    const normalized =
      value instanceof Date
        ? { type: 'date', value: value.toISOString() }
        : { type: typeof value, value };
    return Buffer.from(JSON.stringify({ field, value: normalized, id: String(id) })).toString(
      'base64url',
    );
  }
  private decodeCursor(cursor: string, expectedField: string) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as Record<
        string,
        unknown
      >;
      if (
        parsed.field !== expectedField ||
        !Types.ObjectId.isValid(String(parsed.id)) ||
        !parsed.value ||
        typeof parsed.value !== 'object'
      )
        throw new Error();
      const wrapped = parsed.value as Record<string, unknown>;
      const value = wrapped.type === 'date' ? new Date(String(wrapped.value)) : wrapped.value;
      if (value instanceof Date && Number.isNaN(value.valueOf())) throw new Error();
      return { value, id: new Types.ObjectId(String(parsed.id)) };
    } catch {
      throw new BadRequestException('SEARCH_CURSOR_INVALID');
    }
  }
  private escape(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  }
  private conditionCount(value: unknown): number {
    if (!value || typeof value !== 'object') return 0;
    if (Array.isArray(value)) {
      let count = 0;
      for (const item of value as unknown[]) count += this.conditionCount(item);
      return count;
    }
    const object = value as Record<string, unknown>;
    if ('field' in object) return 1;
    let count = 0;
    for (const item of Object.values(object)) count += this.conditionCount(item);
    return count;
  }
}
