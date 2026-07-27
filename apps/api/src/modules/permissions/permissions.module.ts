import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '../../cache/cache.module.js';
import { RolesModule } from '../roles/roles.module.js';
import { PermissionGuard } from './guards/permission.guard.js';
import { PermissionInvalidationListener } from './listeners/permission-invalidation.listener.js';
import { PrivilegedAccessAudit, PrivilegedAccessAuditSchema } from './schemas/privileged-audit.schema.js';
import { PermissionCacheService } from './services/permission-cache.service.js';
import { PermissionEventsService } from './services/permission-events.service.js';
import { PolicyService } from './services/policy.service.js';
import { PrivilegedAuditService } from './services/privileged-audit.service.js';

@Module({
  imports: [
    CacheModule,
    forwardRef(() => RolesModule),
    MongooseModule.forFeature([
      { name: PrivilegedAccessAudit.name, schema: PrivilegedAccessAuditSchema },
    ]),
  ],
  providers: [
    PermissionCacheService,
    PermissionEventsService,
    PermissionInvalidationListener,
    PolicyService,
    PrivilegedAuditService,
    PermissionGuard,
  ],
  exports: [PolicyService, PermissionEventsService, PrivilegedAuditService, PermissionGuard],
})
export class PermissionsModule {}
