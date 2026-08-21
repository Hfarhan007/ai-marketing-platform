import type { ClientSession, Types } from 'mongoose';

export interface CrmEntity {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  version: number;
  deletedAt: Date | null;
}

export interface CrmPage<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  nextCursor: string | null;
}

export interface CrmEvent {
  workspaceId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, string | number | boolean>;
  correlationId?: string;
  causationId?: string;
  session?: ClientSession;
}

export type SortDirection = 'asc' | 'desc';
