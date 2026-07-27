import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { Role, RoleScope, RoleStatus } from '../schemas/role.schema.js';

@Injectable()
export class RolesRepository {
  constructor(@InjectModel(Role.name) private readonly roles: Model<Role>) {}

  findAssigned(workspaceId: string, roleIds: readonly string[]): Promise<Role[]> {
    const ids = roleIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (ids.length === 0) return Promise.resolve([]);
    return this.roles.find({
      _id: { $in: ids },
      status: RoleStatus.Active,
      revokedAt: null,
      $or: [
        { scope: RoleScope.System, workspaceId: null },
        { scope: RoleScope.Workspace, workspaceId: new Types.ObjectId(workspaceId) },
      ],
    }).lean<Role[]>().exec();
  }

  createWorkspaceRole(
    workspaceId: string,
    input: Pick<Role, 'name' | 'key' | 'permissions' | 'permissionGroups'>,
  ): Promise<Role> {
    return this.roles.create({
      ...input,
      workspaceId: new Types.ObjectId(workspaceId),
      scope: RoleScope.Workspace,
      status: RoleStatus.Active,
      immutable: false,
    }).then((role) => role.toObject());
  }

  revokeWorkspaceRole(workspaceId: string, roleId: string): Promise<Role | null> {
    if (!Types.ObjectId.isValid(roleId)) return Promise.resolve(null);
    return this.roles.findOneAndUpdate(
      {
        _id: new Types.ObjectId(roleId),
        workspaceId: new Types.ObjectId(workspaceId),
        scope: RoleScope.Workspace,
        immutable: false,
        status: RoleStatus.Active,
      },
      { $set: { status: RoleStatus.Revoked, revokedAt: new Date() } },
      { new: true },
    ).lean<Role>().exec();
  }
}
