import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { isValidObjectId } from 'mongoose';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../cache/redis.constants.js';
import type { WorkspaceRequestContext } from '../../common/types/workspace-context.js';
import { CustomFieldRepository } from './repositories/custom-field.repository.js';
import type {
  CustomFieldEntity,
  CustomFieldRule,
  CustomFieldType,
  CustomFieldValues,
} from './custom-field.types.js';
import type {
  CreateCustomFieldDto,
  MigrateCustomFieldDto,
  UpdateCustomFieldDto,
} from './dto/custom-field.dto.js';
import type { CustomFieldDefinition } from './schemas/custom-field.schema.js';

export const CUSTOM_FIELD_MIGRATION_QUEUE = 'custom-field-migrations';
const INDEXABLE = new Set<CustomFieldType>([
  'text',
  'number',
  'currency',
  'percentage',
  'boolean',
  'date',
  'datetime',
  'single_select',
  'user',
  'relationship',
]);
const COMPATIBLE: Readonly<Record<CustomFieldType, readonly CustomFieldType[]>> = {
  text: ['long_text', 'email', 'phone', 'url'],
  long_text: ['text'],
  number: ['currency', 'percentage'],
  currency: ['number', 'percentage'],
  percentage: ['number', 'currency'],
  boolean: [],
  date: ['datetime'],
  datetime: ['date'],
  single_select: ['multi_select'],
  multi_select: [],
  user: ['relationship'],
  relationship: ['user'],
  url: ['text', 'long_text'],
  email: ['text', 'long_text'],
  phone: ['text', 'long_text'],
};

@Injectable()
export class CustomFieldService {
  constructor(
    private readonly repository: CustomFieldRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectQueue(CUSTOM_FIELD_MIGRATION_QUEUE) private readonly queue: Queue,
  ) {}

  async definitions(workspaceId: string, entityType: CustomFieldEntity) {
    const key = this.cacheKey(workspaceId, entityType);
    try {
      const cached = await this.redis.get(key);
      if (cached) return JSON.parse(cached) as CustomFieldDefinition[];
    } catch {
      // Database remains authoritative when Redis is unavailable.
    }
    const definitions = await this.repository.list(workspaceId, entityType);
    try {
      await this.redis.set(key, JSON.stringify(definitions), 'EX', 300);
    } catch {
      // Cache failure must not block validated writes.
    }
    return definitions;
  }

  async validateValues(
    workspaceId: string,
    entityType: CustomFieldEntity,
    supplied: CustomFieldValues = {},
    permissions: readonly string[] = [],
  ): Promise<CustomFieldValues> {
    this.assertSafeKeys(supplied);
    const definitions = await this.definitions(workspaceId, entityType);
    const known = new Map(definitions.map((definition) => [definition.key, definition]));
    for (const key of Object.keys(supplied))
      if (!known.has(key)) throw new BadRequestException(`CUSTOM_FIELD_UNKNOWN:${key}`);
    const output: CustomFieldValues = {};
    for (const definition of definitions) {
      const present = Object.prototype.hasOwnProperty.call(supplied, definition.key);
      const value = present ? supplied[definition.key] : definition.defaultValue;
      if (definition.required && (value === undefined || value === null || value === ''))
        throw new BadRequestException(`CUSTOM_FIELD_REQUIRED:${definition.key}`);
      if (value === undefined) continue;
      if (
        present &&
        definition.writePermissions.length &&
        !definition.writePermissions.some((permission) => permissions.includes(permission))
      )
        throw new ForbiddenException(`CUSTOM_FIELD_WRITE_FORBIDDEN:${definition.key}`);
      this.assertValue(definition, value);
      output[definition.key] = value;
    }
    return output;
  }

  async create(context: WorkspaceRequestContext, dto: CreateCustomFieldDto) {
    this.assertDefinition(dto);
    if (dto.indexed && (await this.repository.countIndexed(context.workspaceId)) >= 10)
      throw new BadRequestException('CUSTOM_FIELD_INDEX_LIMIT_REACHED');
    const value = await this.repository.create(context.workspaceId, context.userId, { ...dto });
    await this.invalidate(context.workspaceId, dto.entityType);
    return value;
  }

  async update(context: WorkspaceRequestContext, id: string, dto: UpdateCustomFieldDto) {
    const current = await this.repository.get(context.workspaceId, id);
    if (current.fieldType !== dto.fieldType)
      throw new BadRequestException('CUSTOM_FIELD_TYPE_CHANGE_REQUIRES_MIGRATION');
    if (
      !current.indexed &&
      dto.indexed &&
      (await this.repository.countIndexed(context.workspaceId)) >= 10
    )
      throw new BadRequestException('CUSTOM_FIELD_INDEX_LIMIT_REACHED');
    this.assertDefinition(dto);
    const { version, ...input } = dto;
    const value = await this.repository.update(context.workspaceId, id, context.userId, version, {
      ...input,
      versionHistory: [
        ...current.versionHistory,
        {
          version: current.version,
          fieldType: current.fieldType,
          validation: current.validation,
          options: current.options,
          changedAt: new Date(),
          changedBy: context.userId,
        },
      ],
    });
    await this.invalidate(context.workspaceId, dto.entityType);
    return value;
  }

  async archive(context: WorkspaceRequestContext, id: string, version: number) {
    const current = await this.repository.get(context.workspaceId, id);
    const value = await this.repository.update(context.workspaceId, id, context.userId, version, {
      archived: true,
      indexed: false,
    });
    await this.invalidate(context.workspaceId, current.entityType as CustomFieldEntity);
    return value;
  }

  async migrate(context: WorkspaceRequestContext, id: string, dto: MigrateCustomFieldDto) {
    const current = await this.repository.get(context.workspaceId, id);
    const source = current.fieldType as CustomFieldType;
    if (!COMPATIBLE[source].includes(dto.targetType))
      throw new BadRequestException('CUSTOM_FIELD_MIGRATION_INCOMPATIBLE');
    await this.queue.add(
      'migrate',
      {
        workspaceId: context.workspaceId,
        definitionId: id,
        entityType: current.entityType,
        fieldKey: current.key,
        sourceType: source,
        targetType: dto.targetType,
        expectedVersion: dto.version,
        actorId: context.userId,
      },
      { jobId: `${context.workspaceId}:${id}:${dto.version}:${dto.targetType}` },
    );
    return { accepted: true };
  }

  buildFilter(fieldKey: string, operator: 'eq' | 'in' | 'gte' | 'lte', value: unknown) {
    if (!/^[a-z][a-z0-9_]{1,79}$/u.test(fieldKey))
      throw new BadRequestException('CUSTOM_FIELD_FILTER_INVALID');
    if (value && typeof value === 'object' && !Array.isArray(value))
      throw new BadRequestException('CUSTOM_FIELD_FILTER_INVALID');
    const path = `customFields.${fieldKey}`;
    if (operator === 'eq') return { [path]: value };
    if (operator === 'in') {
      if (!Array.isArray(value) || value.length > 100)
        throw new BadRequestException('CUSTOM_FIELD_FILTER_INVALID');
      return { [path]: { $in: value } };
    }
    return { [path]: { [operator === 'gte' ? '$gte' : '$lte']: value } };
  }

  private assertDefinition(dto: CreateCustomFieldDto) {
    if (dto.indexed && !INDEXABLE.has(dto.fieldType))
      throw new BadRequestException('CUSTOM_FIELD_TYPE_NOT_INDEXABLE');
    const values = dto.options.map((option) => option.value);
    if (values.some((value) => typeof value !== 'string') || new Set(values).size !== values.length)
      throw new BadRequestException('CUSTOM_FIELD_OPTIONS_INVALID');
    if (dto.defaultValue !== undefined)
      this.assertValue(dto as unknown as CustomFieldDefinition, dto.defaultValue);
  }

  private assertValue(
    definition: Pick<CustomFieldDefinition, 'key' | 'fieldType' | 'options' | 'validation'>,
    value: unknown,
  ) {
    const type = definition.fieldType as CustomFieldType;
    const invalid = () => new BadRequestException(`CUSTOM_FIELD_VALUE_INVALID:${definition.key}`);
    if (type === 'boolean' && typeof value !== 'boolean') throw invalid();
    if (['number', 'currency', 'percentage'].includes(type)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw invalid();
      if (type === 'percentage' && (value < 0 || value > 100)) throw invalid();
    }
    if (type === 'multi_select') {
      if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string'))
        throw invalid();
    } else if (
      !['boolean', 'number', 'currency', 'percentage'].includes(type) &&
      typeof value !== 'string'
    )
      throw invalid();
    if (['date', 'datetime'].includes(type) && Number.isNaN(Date.parse(String(value))))
      throw invalid();
    if (['user', 'relationship'].includes(type) && !isValidObjectId(String(value))) throw invalid();
    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(String(value))) throw invalid();
    if (type === 'url') {
      try {
        new URL(String(value));
      } catch {
        throw invalid();
      }
    }
    const allowed = new Set(
      definition.options.filter((option) => !option.archived).map((option) => option.value),
    );
    if (type === 'single_select' && !allowed.has(String(value))) throw invalid();
    if (type === 'multi_select' && !(value as string[]).every((entry) => allowed.has(entry)))
      throw invalid();
    const rule = definition.validation as CustomFieldRule;
    if (
      typeof value === 'number' &&
      (value < (rule.min ?? -Infinity) || value > (rule.max ?? Infinity))
    )
      throw invalid();
    if (typeof value === 'string') {
      if (value.length < (rule.minLength ?? 0) || value.length > (rule.maxLength ?? Infinity))
        throw invalid();
      if (rule.pattern) {
        if (rule.pattern.length > 200) throw invalid();
        try {
          if (!new RegExp(rule.pattern, 'u').test(value)) throw invalid();
        } catch {
          throw invalid();
        }
      }
    }
  }
  private assertSafeKeys(values: CustomFieldValues) {
    for (const key of Object.keys(values))
      if (
        !/^[a-z][a-z0-9_]{1,79}$/u.test(key) ||
        key.includes('.') ||
        key.startsWith('$') ||
        ['__proto__', 'prototype', 'constructor'].includes(key)
      )
        throw new BadRequestException('CUSTOM_FIELD_KEY_INVALID');
  }
  private cacheKey(workspaceId: string, entityType: CustomFieldEntity) {
    return `tenant:${workspaceId}:custom-fields:${entityType}`;
  }
  private async invalidate(workspaceId: string, entityType: CustomFieldEntity) {
    try {
      await this.redis.del(this.cacheKey(workspaceId, entityType));
    } catch {
      // Expiring cache entries provide eventual recovery.
    }
  }
}
