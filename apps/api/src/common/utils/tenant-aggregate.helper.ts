import type { PipelineStage } from 'mongoose';
import { requireWorkspaceObjectId } from './tenant-query.helper.js';

const PROHIBITED_STAGES = new Set(['$lookup', '$graphLookup', '$unionWith', '$out', '$merge']);

export function tenantAggregate(
  workspaceId: string,
  pipeline: readonly PipelineStage[],
): PipelineStage[] {
  for (const stage of pipeline) {
    const stageName = Object.keys(stage)[0];
    if (stageName && PROHIBITED_STAGES.has(stageName)) {
      throw new Error(`Tenant aggregate stage ${stageName} is prohibited`);
    }
  }
  return [
    { $match: { workspaceId: requireWorkspaceObjectId(workspaceId) } },
    ...pipeline,
  ];
}
