import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  FILTER_OPERATORS,
  type FilterOperator,
  type SearchEntity,
  type SearchScalarType,
} from './search.types.js';
import { SEARCH_SCHEMAS } from './search.schemas.js';

const OPERATOR_SUPPORT: Record<FilterOperator, readonly SearchScalarType[]> = {
  eq: ['string', 'number', 'boolean', 'date', 'objectId', 'stringArray'],
  neq: ['string', 'number', 'boolean', 'date', 'objectId', 'stringArray'],
  contains: ['string', 'stringArray'],
  startsWith: ['string'],
  gt: ['number', 'date'],
  lt: ['number', 'date'],
  between: ['number', 'date'],
  in: ['string', 'number', 'date', 'objectId', 'stringArray'],
  notIn: ['string', 'number', 'date', 'objectId', 'stringArray'],
  exists: ['string', 'number', 'boolean', 'date', 'objectId', 'stringArray'],
  relativeDate: ['date'],
};
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
@Injectable()
export class FilterCompiler {
  compile(entity: SearchEntity, node: unknown, workspaceId: string): Record<string, unknown> {
    if (!Types.ObjectId.isValid(workspaceId))
      throw new BadRequestException('SEARCH_WORKSPACE_INVALID');
    const state = { conditions: 0 };
    const value = node === undefined ? {} : this.node(entity, node, 0, state);
    return { workspaceId: new Types.ObjectId(workspaceId), ...value };
  }
  private node(
    entity: SearchEntity,
    input: unknown,
    depth: number,
    state: { conditions: number },
  ): Record<string, unknown> {
    if (depth > 5) throw new BadRequestException('SEARCH_FILTER_DEPTH_EXCEEDED');
    if (!this.plain(input)) throw new BadRequestException('SEARCH_FILTER_INVALID');
    const object = input as Record<string, unknown>;
    this.safeKeys(object);
    if ('field' in object || 'operator' in object) return this.condition(entity, object, state);
    const groupKeys = Object.keys(object);
    if (groupKeys.length !== 1 || !['and', 'or'].includes(groupKeys[0] ?? ''))
      throw new BadRequestException('SEARCH_FILTER_GROUP_INVALID');
    const key = groupKeys[0] as 'and' | 'or',
      children = object[key];
    if (!Array.isArray(children) || children.length < 1)
      throw new BadRequestException('SEARCH_FILTER_GROUP_INVALID');
    return {
      [key === 'and' ? '$and' : '$or']: children.map((child) =>
        this.node(entity, child, depth + 1, state),
      ),
    };
  }
  private condition(
    entity: SearchEntity,
    object: Record<string, unknown>,
    state: { conditions: number },
  ) {
    state.conditions += 1;
    if (state.conditions > 50) throw new BadRequestException('SEARCH_FILTER_CONDITION_LIMIT');
    if (Object.keys(object).some((key) => !['field', 'operator', 'value'].includes(key)))
      throw new BadRequestException('SEARCH_FILTER_INVALID');
    const field = object.field,
      operator = object.operator;
    if (typeof field !== 'string' || !/^[a-zA-Z][a-zA-Z0-9.]*$/u.test(field))
      throw new BadRequestException('SEARCH_FIELD_INVALID');
    if (typeof operator !== 'string' || !FILTER_OPERATORS.includes(operator as FilterOperator))
      throw new BadRequestException('SEARCH_OPERATOR_INVALID');
    const type = SEARCH_SCHEMAS[entity].fields[field];
    if (!type) throw new BadRequestException(`SEARCH_FIELD_NOT_ALLOWED:${field}`);
    if (!OPERATOR_SUPPORT[operator as FilterOperator].includes(type))
      throw new BadRequestException(`SEARCH_OPERATOR_NOT_ALLOWED:${field}:${operator}`);
    const value = object.value;
    if (operator === 'exists') {
      if (typeof value !== 'boolean') throw new BadRequestException('SEARCH_VALUE_INVALID');
      return { [field]: { $exists: value } };
    }
    if (operator === 'relativeDate') {
      if (!this.plain(value)) throw new BadRequestException('SEARCH_VALUE_INVALID');
      const relative = value as Record<string, unknown>;
      this.safeKeys(relative);
      if (
        !['past', 'future'].includes(String(relative.direction)) ||
        !['day', 'week', 'month'].includes(String(relative.unit)) ||
        !Number.isInteger(relative.amount) ||
        Number(relative.amount) < 1 ||
        Number(relative.amount) > 365
      )
        throw new BadRequestException('SEARCH_VALUE_INVALID');
      const multiplier = relative.unit === 'day' ? 1 : relative.unit === 'week' ? 7 : 30;
      const boundary = new Date(
        Date.now() +
          (relative.direction === 'past' ? -1 : 1) *
            Number(relative.amount) *
            multiplier *
            86_400_000,
      );
      return {
        [field]:
          relative.direction === 'past'
            ? { $gte: boundary, $lte: new Date() }
            : { $gte: new Date(), $lte: boundary },
      };
    }
    if (operator === 'between') {
      if (!Array.isArray(value) || value.length !== 2)
        throw new BadRequestException('SEARCH_VALUE_INVALID');
      return { [field]: { $gte: this.value(type, value[0]), $lte: this.value(type, value[1]) } };
    }
    if (operator === 'in' || operator === 'notIn') {
      if (!Array.isArray(value) || value.length < 1 || value.length > 100)
        throw new BadRequestException('SEARCH_VALUE_INVALID');
      return {
        [field]: {
          [operator === 'in' ? '$in' : '$nin']: value.map((entry) => this.value(type, entry)),
        },
      };
    }
    const parsed = this.value(type, value);
    if (operator === 'eq') return { [field]: parsed };
    if (operator === 'neq') return { [field]: { $ne: parsed } };
    if (operator === 'gt' || operator === 'lt')
      return { [field]: { [operator === 'gt' ? '$gt' : '$lt']: parsed } };
    const escaped = String(parsed).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    return {
      [field]: { $regex: operator === 'startsWith' ? `^${escaped}` : escaped, $options: 'i' },
    };
  }
  private value(type: SearchScalarType, value: unknown): unknown {
    if (value && typeof value === 'object') throw new BadRequestException('SEARCH_VALUE_INVALID');
    if (type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw new BadRequestException('SEARCH_VALUE_INVALID');
      return value;
    }
    if (type === 'boolean') {
      if (typeof value !== 'boolean') throw new BadRequestException('SEARCH_VALUE_INVALID');
      return value;
    }
    if (type === 'date') {
      if (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
        throw new BadRequestException('SEARCH_VALUE_INVALID');
      return new Date(value);
    }
    if (type === 'objectId') {
      if (typeof value !== 'string' || !Types.ObjectId.isValid(value))
        throw new BadRequestException('SEARCH_VALUE_INVALID');
      return new Types.ObjectId(value);
    }
    if (typeof value !== 'string' || value.length > 1000)
      throw new BadRequestException('SEARCH_VALUE_INVALID');
    return value;
  }
  private plain(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Reflect.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  private safeKeys(value: Record<string, unknown>) {
    for (const key of Object.keys(value))
      if (key.startsWith('$') || key.includes('\0') || FORBIDDEN.has(key))
        throw new BadRequestException('SEARCH_QUERY_INJECTION');
  }
}
