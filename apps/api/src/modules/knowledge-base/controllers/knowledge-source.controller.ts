import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { IngestKnowledgeSourceDto } from '../dto/ingest-knowledge-source.dto.js';
import { KnowledgeSourceService } from '../services/knowledge-source.service.js';
@ApiTags('knowledge base')
@Controller('knowledge-base/sources')
@RequireWorkspace()
export class KnowledgeSourceController {
  constructor(private readonly service: KnowledgeSourceService) {}
  @Post('ingest') @RequirePermissions('files.manage') ingest(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: IngestKnowledgeSourceDto,
  ) {
    return this.service.ingest(c, d);
  }
}
