import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesRepository } from './repositories/roles.repository.js';
import { Role, RoleSchema } from './schemas/role.schema.js';
import { RolesController } from './controllers/roles.controller.js';
import { RolesService } from './services/roles.service.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { PermissionsModule } from '../permissions/permissions.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
    MembershipsModule,
    forwardRef(() => PermissionsModule),
  ],
  controllers: [RolesController],
  providers: [RolesRepository, RolesService],
  exports: [RolesRepository],
})
export class RolesModule {}
