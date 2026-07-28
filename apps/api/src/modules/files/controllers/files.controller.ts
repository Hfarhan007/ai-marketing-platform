import { Body, Controller, Delete, Get, Param, Post, Put, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RequireWorkspace } from '../../../common/decorators/require-workspace.decorator.js';
import { WorkspaceContext } from '../../../common/decorators/workspace-context.decorator.js';
import { ParseMongoIdPipe } from '../../../common/pipes/parse-mongo-id.pipe.js';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import { RequirePermissions } from '../../permissions/decorators/require-permissions.decorator.js';
import { CompleteUploadDto, InitiateUploadDto, UsageReferenceDto } from '../dto/file.dto.js';
import { FilesService } from '../services/files.service.js';
import { LocalStorageProvider } from '../storage/storage.providers.js';
interface RawRequest {
  rawBody?: Buffer;
  headers: Record<string, string | string[] | undefined>;
}
interface BinaryReply {
  type(contentType: string): BinaryReply;
  send(body: Buffer): void;
}
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly service: FilesService,
    private readonly local: LocalStorageProvider,
  ) {}
  @Post('uploads') @RequireWorkspace() @RequirePermissions('files.manage') initiate(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Body() d: InitiateUploadDto,
  ) {
    return this.service.initiate(c, d);
  }
  @Post(':id/complete') @RequireWorkspace() @RequirePermissions('files.manage') complete(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: CompleteUploadDto,
  ) {
    return this.service.complete(c, id, d);
  }
  @Get(':id/download') @RequireWorkspace() @RequirePermissions('files.read') download(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.download(c, id);
  }
  @Delete(':id') @RequireWorkspace() @RequirePermissions('files.manage') remove(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.remove(c, id);
  }
  @Post(':id/restore') @RequireWorkspace() @RequirePermissions('files.manage') restore(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.service.restore(c, id);
  }
  @Post(':id/references') @RequireWorkspace() @RequirePermissions('files.manage') reference(
    @WorkspaceContext() c: WorkspaceRequestContext,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() d: UsageReferenceDto,
  ) {
    return this.service.reference(c, id, d);
  }
  @Get('usage/summary') @RequireWorkspace() @RequirePermissions('files.read') usage(
    @WorkspaceContext() c: WorkspaceRequestContext,
  ) {
    return this.service.usage(c);
  }
  @Public() @Put('local-upload/:token') async localUpload(
    @Param('token') token: string,
    @Req() request: RawRequest,
  ) {
    if (!request.rawBody) throw new Error('Raw upload body unavailable');
    const value = request.headers['content-type'],
      contentType = Array.isArray(value) ? value[0] : value;
    await this.local.put(token, request.rawBody, contentType);
    return { uploaded: true };
  }
  @Public() @Get('local-download/:token') async localDownload(
    @Param('token') token: string,
    @Res() reply: BinaryReply,
  ) {
    const body = await this.local.download(token);
    reply.type('application/octet-stream').send(body);
  }
}
