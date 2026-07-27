import { Types, type mongo } from 'mongoose';

export function requireWorkspaceObjectId(workspaceId: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(workspaceId)) throw new Error('Invalid workspace identifier');
  return new Types.ObjectId(workspaceId);
}

export function tenantFilter<T>(
  workspaceId: string,
  filter: mongo.Filter<T> = {},
): mongo.Filter<T> {
  return {
    $and: [{ workspaceId: requireWorkspaceObjectId(workspaceId) }, filter],
  } as mongo.Filter<T>;
}
