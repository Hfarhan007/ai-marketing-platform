import { BadRequestException, Injectable } from '@nestjs/common';
import type { WorkspaceRequestContext } from '../../common/types/workspace-context.js';
import { OutboxService } from '../../events/outbox.service.js';
import { PolicyService } from '../permissions/services/policy.service.js';
import { ActivityProjectionService } from './activity-projection.service.js';
import type { ActivityQueryDto } from './dto/activity-query.dto.js';
import { ActivityRepository } from './repositories/activity.repository.js';

@Injectable()
export class ActivityService {
  constructor(
    private readonly repository: ActivityRepository,
    private readonly policy: PolicyService,
    private readonly outbox: OutboxService,
    private readonly projector: ActivityProjectionService,
  ) {}
  async timeline(context: WorkspaceRequestContext, query: ActivityQueryDto) {
    if ((query.entityType && !query.entityId) || (!query.entityType && query.entityId))
      throw new BadRequestException('Both entityType and entityId are required');
    const ability = await this.policy.ability(context);
    const permissions = [...ability.permissions];
    const allowedVisibilities = ['workspace', 'restricted'];
    if (this.policy.has(ability, 'admin.access')) allowedVisibilities.push('internal');
    const result = await this.repository.page(context.workspaceId, {
      limit: query.limit,
      ...(query.cursor ? { cursor: query.cursor } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      allowedVisibilities:
        query.visibility && allowedVisibilities.includes(query.visibility)
          ? [query.visibility]
          : allowedVisibilities,
      permissions,
    });
    return {
      ...result,
      items: result.items.map((value) => ({
        id: String(value._id),
        type: value.type,
        sourceDomain: value.sourceDomain,
        aggregate: { type: value.aggregateType, id: value.aggregateId },
        relatedEntities: value.relatedEntities,
        actorId: value.actorId ? String(value.actorId) : null,
        actor: value.actorSnapshot,
        correlationId: value.correlationId,
        visibility: value.visibility,
        data: value.data,
        occurredAt: value.occurredAt,
        processedAt: value.processedAt,
      })),
    };
  }
  async rebuild(context: WorkspaceRequestContext) {
    let projected = 0;
    for await (const event of this.outbox.retained(context.workspaceId)) {
      const result = await this.projector.project({
        eventId: event.eventId,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        workspaceId: String(event.workspaceId),
        payload: event.payload,
        metadata: event.metadata,
        correlationId: event.correlationId,
        ...(event.causationId ? { causationId: event.causationId } : {}),
        occurredAt: event.occurredAt.toISOString(),
      });
      if (result.projected) projected += 1;
    }
    return { projected };
  }
}
