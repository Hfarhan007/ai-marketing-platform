import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { Workspace, WorkspaceStatus } from '../schemas/workspace.schema.js';

@Injectable()
export class WorkspacesRepository {
  constructor(@InjectModel(Workspace.name) private readonly workspaces: Model<Workspace>) {}

  findActiveById(workspaceId: string): Promise<Workspace | null> {
    if (!Types.ObjectId.isValid(workspaceId)) return Promise.resolve(null);
    return this.workspaces
      .findOne({ _id: new Types.ObjectId(workspaceId), status: WorkspaceStatus.Active })
      .lean<Workspace>()
      .exec();
  }
}
