import { Module } from '@nestjs/common';
import { RolesController } from './controllers/roles.controller.js';
import { RolesService } from './services/roles.service.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { PermissionsModule } from '../permissions/permissions.module.js';
import { RolePersistenceModule } from './role-persistence.module.js';

@Module({
  imports: [
    RolePersistenceModule,
    MembershipsModule,
    PermissionsModule,
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolePersistenceModule],
})
export class RolesModule {}
