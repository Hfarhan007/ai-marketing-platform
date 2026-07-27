import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type {
  RequestWithWorkspaceContext,
  WorkspaceRequestContext,
} from '../types/workspace-context.js';

export const WorkspaceContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): WorkspaceRequestContext => {
    const request = context.switchToHttp().getRequest<RequestWithWorkspaceContext>();
    if (!request.workspaceContext) throw new Error('Workspace guard did not establish context');
    return request.workspaceContext;
  },
);
