import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { ConnectorSyncService } from '../connectors/connector-sync.service.js';
import {
  KNOWLEDGE_SOURCE_TYPES,
  type KnowledgeSourceType,
} from '../connectors/knowledge-connector.types.js';
class CreateConnectorDto {
  @IsIn(KNOWLEDGE_SOURCE_TYPES) type!: KnowledgeSourceType;
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsObject() configuration!: Record<string, unknown>;
  @IsOptional() @IsObject() credentials?: Record<string, unknown>;
  @IsOptional() @IsArray() @IsString({ each: true }) allowedDomains?: string[];
}
class SyncConnectorDto {
  @IsString() @MinLength(8) @MaxLength(200) idempotencyKey!: string;
}
@Controller('knowledge-base/connectors')
@RequireWorkspace()
export class KnowledgeConnectorController {
  constructor(private readonly connectors: ConnectorSyncService) {}
  @Post() @RequirePermissions('files.manage') create(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Body() body: CreateConnectorDto,
  ) {
    return this.connectors.create({
      workspaceId: context.workspaceId,
      userId: context.userId,
      type: body.type,
      name: body.name,
      configuration: body.configuration,
      ...(body.credentials ? { credentials: body.credentials } : {}),
      ...(body.allowedDomains ? { allowedDomains: body.allowedDomains } : {}),
    });
  }
  @Post(':connectionId/sync') @RequirePermissions('files.manage') sync(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('connectionId') connectionId: string,
    @Body() body: SyncConnectorDto,
  ) {
    return this.connectors.sync({
      workspaceId: context.workspaceId,
      userId: context.userId,
      connectionId,
      idempotencyKey: body.idempotencyKey,
    });
  }
  @Delete(':connectionId') @RequirePermissions('files.manage') remove(
    @WorkspaceContext() context: WorkspaceRequestContext,
    @Param('connectionId') connectionId: string,
  ) {
    return this.connectors.delete(context.workspaceId, connectionId);
  }
}
