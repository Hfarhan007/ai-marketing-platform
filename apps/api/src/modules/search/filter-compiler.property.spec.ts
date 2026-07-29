import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { FilterCompiler } from './filter-compiler.service.js';

const workspaceId = new Types.ObjectId().toHexString();
const compiler = new FilterCompiler();
const randomString = (seed: number) => {
  let value = seed >>> 0,
    output = '';
  for (let index = 0; index < 20; index += 1) {
    value = (value * 1_664_525 + 1_013_904_223) >>> 0;
    output += String.fromCharCode(32 + (value % 95));
  }
  return output;
};

describe('FilterCompiler generative properties', () => {
  it('always enforces the supplied workspace for valid generated filters', () => {
    for (let index = 1; index <= 500; index += 1) {
      const input = {
        and: [
          { field: 'status', operator: index % 2 ? 'eq' : 'neq', value: randomString(index) },
          { field: 'score', operator: index % 3 ? 'gt' : 'lt', value: index },
        ],
      };
      const result = compiler.compile('leads', input, workspaceId);
      expect(String(result.workspaceId)).toBe(workspaceId);
      expect(JSON.stringify(result)).not.toContain('"workspaceId":{"$');
    }
  });

  it('rejects generated MongoDB operators and prototype-pollution keys', () => {
    const dangerous = [
      '$where',
      '$expr',
      '$function',
      '$regex',
      '$ne',
      '__proto__',
      'prototype',
      'constructor',
    ];
    for (let index = 0; index < 500; index += 1) {
      const key = dangerous[index % dangerous.length]!;
      const input = Object.create(null) as Record<string, unknown>;
      input[key] = randomString(index);
      expect(() => compiler.compile('contacts', input, workspaceId)).toThrow(BadRequestException);
    }
  });

  it('treats generated regex metacharacters as literal contains input', () => {
    const metacharacters = ['.*', '^admin$', '(a+)+$', '[abc]', '{1,100}', '\\w+', 'a|b'];
    for (const value of metacharacters) {
      const result = compiler.compile(
        'contacts',
        { field: 'displayName', operator: 'contains', value },
        workspaceId,
      );
      const condition = result.displayName as Record<string, unknown>;
      expect(condition.$regex).not.toBe(value);
      expect(condition.$options).toBe('i');
    }
  });

  it('rejects excessive generated nesting and condition counts', () => {
    let nested: unknown = { field: 'status', operator: 'eq', value: 'open' };
    for (let index = 0; index < 8; index += 1) nested = { and: [nested] };
    expect(() => compiler.compile('leads', nested, workspaceId)).toThrow(
      'SEARCH_FILTER_DEPTH_EXCEEDED',
    );
    expect(() =>
      compiler.compile(
        'leads',
        {
          or: Array.from({ length: 51 }, (_, index) => ({
            field: 'score',
            operator: 'eq',
            value: index,
          })),
        },
        workspaceId,
      ),
    ).toThrow('SEARCH_FILTER_CONDITION_LIMIT');
  });
});

describe('FilterCompiler operator coverage', () => {
  it.each([
    ['eq', 'open'],
    ['neq', 'closed'],
    ['contains', 'lead'],
    ['startsWith', 'new'],
    ['in', ['open', 'closed']],
    ['notIn', ['deleted']],
    ['exists', true],
  ])('compiles %s', (operator, value) => {
    expect(() =>
      compiler.compile('leads', { field: 'status', operator, value }, workspaceId),
    ).not.toThrow();
  });
  it.each([
    ['gt', 10],
    ['lt', 90],
    ['between', [10, 90]],
  ])('compiles numeric %s', (operator, value) => {
    expect(() =>
      compiler.compile('leads', { field: 'score', operator, value }, workspaceId),
    ).not.toThrow();
  });
  it('compiles relative dates and nested OR groups', () => {
    expect(() =>
      compiler.compile(
        'tasks',
        {
          or: [
            {
              field: 'dueAt',
              operator: 'relativeDate',
              value: { direction: 'future', amount: 2, unit: 'week' },
            },
            { field: 'dueAt', operator: 'between', value: ['2026-01-01', '2026-12-31'] },
          ],
        },
        workspaceId,
      ),
    ).not.toThrow();
  });
});
