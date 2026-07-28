import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CustomFieldService } from './custom-field.service.js';
import type { CustomFieldType } from './custom-field.types.js';

const definition = (key: string, fieldType: CustomFieldType, extra: Record<string, unknown> = {}) =>
  ({
    key,
    fieldType,
    options: [],
    validation: {},
    defaultValue: undefined,
    required: false,
    writePermissions: [],
    ...extra,
  }) as never;

function fixture(definitions: unknown[]) {
  const repository = {
      list: vi.fn().mockResolvedValue(definitions),
      get: vi.fn(),
      countIndexed: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
    },
    redis = {
      get: vi.fn().mockRejectedValue(new Error('offline')),
      set: vi.fn().mockRejectedValue(new Error('offline')),
      del: vi.fn(),
    },
    queue = { add: vi.fn().mockResolvedValue({ id: 'job' }) };
  return {
    service: new CustomFieldService(repository as never, redis as never, queue as never),
    repository,
    queue,
  };
}

describe('CustomFieldService value validation', () => {
  it.each([
    ['text', 'value'],
    ['long_text', 'value'],
    ['number', 12],
    ['currency', 12.5],
    ['percentage', 50],
    ['boolean', true],
    ['date', '2026-01-01'],
    ['datetime', '2026-01-01T12:00:00Z'],
    ['user', '507f1f77bcf86cd799439011'],
    ['relationship', '507f1f77bcf86cd799439011'],
    ['url', 'https://example.com'],
    ['email', 'person@example.com'],
    ['phone', '+1 555 0100'],
  ] as const)('accepts %s values', async (fieldType, value) => {
    const { service } = fixture([definition('field_name', fieldType)]);
    await expect(
      service.validateValues('507f1f77bcf86cd799439011', 'contacts', {
        field_name: value,
      }),
    ).resolves.toEqual({ field_name: value });
  });

  it('validates select options, defaults, required fields, and rules', async () => {
    const { service } = fixture([
      definition('tier', 'single_select', {
        options: [{ value: 'gold', label: 'Gold' }],
        required: true,
        defaultValue: 'gold',
      }),
      definition('score', 'number', { validation: { min: 1, max: 10 } }),
    ]);
    await expect(service.validateValues('w', 'contacts', { score: 5 })).resolves.toEqual({
      tier: 'gold',
      score: 5,
    });
    await expect(service.validateValues('w', 'contacts', { score: 20 })).rejects.toThrow(
      'CUSTOM_FIELD_VALUE_INVALID:score',
    );
  });

  it('rejects unknown fields, query injection, and unauthorized writes', async () => {
    const { service } = fixture([
      definition('private_note', 'text', { writePermissions: ['contacts.private.write'] }),
    ]);
    await expect(service.validateValues('w', 'contacts', { unknown: 'x' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.validateValues('w', 'contacts', { private_note: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(() => service.buildFilter('$where', 'eq', 'x')).toThrow('CUSTOM_FIELD_FILTER_INVALID');
    expect(() => service.buildFilter('safe_key', 'eq', { $ne: null })).toThrow(
      'CUSTOM_FIELD_FILTER_INVALID',
    );
  });
});

describe('CustomFieldService definition migrations', () => {
  it('requires migration instead of direct type changes', async () => {
    const { service, repository } = fixture([]);
    repository.get.mockResolvedValue({
      ...definition('score', 'number'),
      entityType: 'contacts',
      indexed: false,
      version: 1,
      versionHistory: [],
    });
    await expect(
      service.update(
        { workspaceId: '507f1f77bcf86cd799439011', userId: '507f1f77bcf86cd799439012' },
        '507f1f77bcf86cd799439013',
        {
          entityType: 'contacts',
          key: 'score',
          label: 'Score',
          fieldType: 'text',
          group: 'General',
          options: [],
          validation: {},
          visibilityRules: {},
          required: false,
          readPermissions: [],
          writePermissions: [],
          indexed: false,
          version: 1,
        },
      ),
    ).rejects.toThrow('CUSTOM_FIELD_TYPE_CHANGE_REQUIRES_MIGRATION');
  });

  it('queues compatible migrations idempotently and rejects incompatible ones', async () => {
    const { service, repository, queue } = fixture([]);
    repository.get.mockResolvedValue({
      ...definition('amount', 'number'),
      entityType: 'deals',
      version: 2,
    });
    const context = {
      workspaceId: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
    };
    await expect(
      service.migrate(context, '507f1f77bcf86cd799439013', {
        version: 2,
        targetType: 'currency',
      }),
    ).resolves.toEqual({ accepted: true });
    expect(queue.add).toHaveBeenCalledWith(
      'migrate',
      expect.objectContaining({ sourceType: 'number', targetType: 'currency' }),
      expect.objectContaining({
        jobId: expect.stringContaining(':2:currency') as string,
      }),
    );
    await expect(
      service.migrate(context, '507f1f77bcf86cd799439013', {
        version: 2,
        targetType: 'boolean',
      }),
    ).rejects.toThrow('CUSTOM_FIELD_MIGRATION_INCOMPATIBLE');
  });
});
