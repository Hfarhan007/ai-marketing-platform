const backendDomains = {
  identityAccess: ['auth', 'users', 'memberships', 'roles', 'permissions'],
  workspaceManagement: ['workspaces', 'workspace-settings'],
  crm: ['contacts', 'companies', 'leads'],
  sales: ['deals', 'pipelines'],
  tasksScheduling: [
    'tasks',
    'calendar',
    'appointments',
    'availability',
    'booking-links',
    'services',
  ],
  messaging: ['inbox', 'notifications'],
  marketingCampaigns: ['campaigns'],
  workflowAutomation: ['workflows'],
  ai: ['agents'],
  knowledgeManagement: ['knowledge-base', 'files'],
  billing: ['billing'],
  compliance: ['consent', 'compliance', 'audit'],
  integrations: ['integrations'],
  administration: ['admin'],
};
const modulePattern = (modules) => `^apps/api/src/modules/(?:${modules.join('|')})/`;
const persistencePattern = (modules) =>
  `^apps/api/src/modules/(?:${modules.join('|')})/(?:repositories|schemas)/`;
const crossDomainPersistenceRules = Object.entries(backendDomains).map(([name, modules]) => {
  const otherModules = Object.entries(backendDomains)
    .filter(([otherName]) => otherName !== name)
    .flatMap(([, values]) => values);
  return {
    name: `no-${name}-cross-domain-persistence`,
    severity: 'error',
    from: { path: modulePattern(modules) },
    to: { path: persistencePattern(otherModules) },
    comment: 'Cross-domain behavior must use exported application services or integration events.',
  };
});

export default {
  forbidden: [
    {
      name: 'no-feature-private-imports',
      severity: 'error',
      from: { path: '^apps/web/src/features/([^/]+)/' },
      to: {
        path: '^apps/web/src/features/([^/]+)/(?!index\\.ts$)',
        pathNot: '^apps/web/src/features/$1/',
      },
    },
    {
      name: 'shared-cannot-import-features',
      severity: 'error',
      from: { path: '^apps/web/src/shared/' },
      to: { path: '^apps/web/src/features/' },
    },
    {
      name: 'api-controllers-cannot-import-persistence',
      severity: 'error',
      from: { path: '^apps/api/src/modules/[^/]+/controllers/' },
      to: { path: '^apps/api/src/modules/[^/]+/(?:repositories|schemas)/' },
    },
    {
      name: 'domain-models-are-framework-independent',
      severity: 'error',
      from: { path: '^apps/api/src/domains/' },
      to: { path: '^(?:node_modules/)?(?:@nestjs|mongoose|bullmq|ioredis)' },
    },
    ...crossDomainPersistenceRules,
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.base.json' },
  },
};
