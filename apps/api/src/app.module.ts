import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from './cache/cache.module.js';
import { PlatformAdminGuard } from './common/guards/platform-admin.guard.js';
import { WorkspaceGuard } from './common/guards/workspace.guard.js';
import { AuthenticationGuard } from './modules/auth/guards/authentication.guard.js';
import { CsrfGuard } from './modules/auth/guards/csrf.guard.js';
import { PermissionGuard } from './modules/permissions/guards/permission.guard.js';
import { ConfigurationModule } from './config/configuration.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EventsModule } from './events/events.module.js';
import { HealthModule } from './health/health.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { AgentsModule } from './modules/agents/agents.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { CalendarModule } from './modules/calendar/calendar.module.js';
import { CampaignsModule } from './modules/campaigns/campaigns.module.js';
import { CompaniesModule } from './modules/companies/companies.module.js';
import { ComplianceModule } from './modules/compliance/compliance.module.js';
import { ConsentModule } from './modules/consent/consent.module.js';
import { ContactsModule } from './modules/contacts/contacts.module.js';
import { DealsModule } from './modules/deals/deals.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { InboxModule } from './modules/inbox/inbox.module.js';
import { IntegrationsModule } from './modules/integrations/integrations.module.js';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module.js';
import { LeadsModule } from './modules/leads/leads.module.js';
import { MembershipsModule } from './modules/memberships/memberships.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { PermissionsModule } from './modules/permissions/permissions.module.js';
import { PipelinesModule } from './modules/pipelines/pipelines.module.js';
import { RolesModule } from './modules/roles/roles.module.js';
import { TasksModule } from './modules/tasks/tasks.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorkflowsModule } from './modules/workflows/workflows.module.js';
import { WorkspacesModule } from './modules/workspaces/workspaces.module.js';
import { WorkspaceSettingsModule } from './modules/workspace-settings/workspace-settings.module.js';
import { ObservabilityModule } from './observability/observability.module.js';
import { QueuesModule } from './queues/queues.module.js';
import { SecurityModule } from './security/security.module.js';

@Module({
  imports: [
    ConfigurationModule,
    ObservabilityModule,
    DatabaseModule,
    CacheModule,
    QueuesModule,
    EventsModule,
    SecurityModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    MembershipsModule,
    WorkspaceSettingsModule,
    RolesModule,
    PermissionsModule,
    ContactsModule,
    CompaniesModule,
    LeadsModule,
    DealsModule,
    PipelinesModule,
    TasksModule,
    InboxModule,
    WorkflowsModule,
    AgentsModule,
    KnowledgeBaseModule,
    CampaignsModule,
    CalendarModule,
    AppointmentsModule,
    FilesModule,
    IntegrationsModule,
    BillingModule,
    ConsentModule,
    ComplianceModule,
    AuditModule,
    NotificationsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PlatformAdminGuard },
    { provide: APP_GUARD, useClass: WorkspaceGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
