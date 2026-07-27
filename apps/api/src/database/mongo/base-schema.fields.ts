import { Schema, type SchemaDefinition } from 'mongoose';

export interface BaseSchemaFieldOptions {
  workspaceScoped?: boolean;
  softDelete?: boolean;
}

export function createBaseSchemaFields(options: BaseSchemaFieldOptions = {}): SchemaDefinition {
  return {
    _id: { type: Schema.Types.ObjectId, auto: true },
    ...(options.workspaceScoped
      ? { workspaceId: { type: Schema.Types.ObjectId, required: true, index: false } }
      : {}),
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, required: false },
    updatedBy: { type: Schema.Types.ObjectId, required: false },
    version: { type: Number, required: true, default: 1, min: 1 },
    ...(options.softDelete ? { deletedAt: { type: Date, default: null } } : {}),
  };
}

export const BASE_SCHEMA_OPTIONS = {
  timestamps: true,
  versionKey: false,
  strict: 'throw',
} as const;
