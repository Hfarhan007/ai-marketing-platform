import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import type { WorkspaceRequestContext } from '../../../common/types/workspace-context.js';
import type { Permission } from '../constants/permission.catalog.js';
import { PrivilegedAccessAudit } from '../schemas/privileged-audit.schema.js';

@Injectable()
export class PrivilegedAuditService {
  constructor(
    @InjectModel(PrivilegedAccessAudit.name)
    private readonly audits: Model<PrivilegedAccessAudit>,
  ) {}

  async record(
    context: WorkspaceRequestContext,
    permissions: readonly Permission[],
    authorized: boolean,
    operation: string,
  ): Promise<void> {
    await this.audits.create({
      workspaceId: new Types.ObjectId(context.workspaceId),
      userId: new Types.ObjectId(context.userId),
      membershipId: new Types.ObjectId(context.membershipId),
      requiredPermissions: [...permissions],
      authorized,
      operation,
    });
  }
}
