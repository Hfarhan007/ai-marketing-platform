import type {
  AppRouteDefinition,
  GuestRouteId,
  OnboardingRouteId,
  WorkspaceRouteId,
} from './route-types';

const guest = (id: GuestRouteId, path: string, title: string): AppRouteDefinition<GuestRouteId> => ({
  id, path, metadata: { breadcrumb: title, scope: 'guest', title },
});
const onboarding = (id: OnboardingRouteId, path: string, title: string): AppRouteDefinition<OnboardingRouteId> => ({
  id, path, metadata: { breadcrumb: title, scope: 'protected', title },
});
const workspace = (
  id: WorkspaceRouteId,
  path: string,
  title: string,
  access: Partial<AppRouteDefinition['metadata']> = {},
): AppRouteDefinition<WorkspaceRouteId> => ({
  id, path, metadata: { breadcrumb: title, scope: 'workspace', title, ...access },
});

export const guestRoutes = [
  guest('login', 'login', 'Sign in'),
  guest('register', 'register', 'Create account'),
  guest('forgotPassword', 'forgot-password', 'Reset password'),
  guest('resetPassword', 'reset-password', 'Choose a new password'),
  guest('verifyEmail', 'verify-email', 'Verify email'),
  guest('twoFactor', 'two-factor', 'Two-factor authentication'),
  guest('recoveryCode', 'recovery-code', 'Use a recovery code'),
  guest('sessionExpired', 'session-expired', 'Session expired'),
  guest('accountLocked', 'account-locked', 'Account locked'),
  guest('acceptInvite', 'accept-invite', 'Accept invitation'),
] as const;

export const onboardingRoutes = [
  onboarding('onboarding', '', 'Welcome'),
  onboarding('workspace', 'workspace', 'Create your workspace'),
  onboarding('industry', 'industry', 'Choose your industry'),
  onboarding('goals', 'goals', 'Set your goals'),
  onboarding('channels', 'channels', 'Select your channels'),
  onboarding('team', 'team', 'Invite your team'),
  onboarding('branding', 'branding', 'Add your branding'),
  onboarding('summary', 'summary', 'Review setup'),
] as const;

export const workspaceRoutes = [
  workspace('dashboard', 'dashboard', 'Dashboard'),
  workspace('contacts', 'contacts', 'Contacts', { permission: 'contacts:read' }),
  workspace('contactDetails', 'contacts/:contactId', 'Contact details', { permission: 'contacts:read' }),
  workspace('companies', 'companies', 'Companies'),
  workspace('leads', 'leads', 'Leads'),
  workspace('deals', 'deals', 'Deals'),
  workspace('pipeline', 'pipelines', 'Pipeline'),
  workspace('tasks', 'tasks', 'Tasks'),
  workspace('inbox', 'inbox', 'Inbox'),
  workspace('conversation', 'inbox/:conversationId', 'Conversation'),
  workspace('workflows', 'workflows', 'Workflows', { featureFlag: 'workflowAutomation', minimumPlan: 'pro' }),
  workspace('workflowNew', 'workflows/new', 'New workflow', { featureFlag: 'workflowAutomation', minimumPlan: 'pro' }),
  workspace('workflowDetails', 'workflows/:workflowId', 'Workflow details', { featureFlag: 'workflowAutomation', minimumPlan: 'pro' }),
  workspace('aiAgents', 'agents', 'AI agents', { featureFlag: 'aiAgents', minimumPlan: 'pro' }),
  workspace('agentDetails', 'agents/:agentId', 'Agent details', { featureFlag: 'aiAgents', minimumPlan: 'pro' }),
  workspace('knowledgeBase', 'knowledge-base', 'Knowledge base', { minimumPlan: 'pro' }),
  workspace('campaigns', 'campaigns', 'Campaigns', { permission: 'campaigns:read' }),
  workspace('calendar', 'calendar', 'Calendar'),
  workspace('appointments', 'appointments', 'Appointments'),
  workspace('forms', 'forms', 'Forms'),
  workspace('landingPages', 'pages', 'Landing pages'),
  workspace('funnels', 'funnels', 'Funnels'),
  workspace('analytics', 'analytics', 'Analytics'),
  workspace('mediaLibrary', 'media-library', 'Media library'),
  workspace('integrations', 'integrations', 'Integrations'),
  workspace('developerPortal', 'developer', 'Developer portal', { permission: 'settings:manage', minimumPlan: 'pro' }),
  workspace('team', 'team', 'Team', { permission: 'team:manage' }),
  workspace('billing', 'billing', 'Billing', { permission: 'settings:manage' }),
  workspace('settings', 'settings', 'Settings', { permission: 'settings:manage' }),
  workspace('consentManagement', 'consent', 'Consent management', { permission: 'settings:manage' }),
  workspace('compliance', 'compliance', 'Compliance', { permission: 'settings:manage', minimumPlan: 'enterprise' }),
  workspace('admin', 'admin', 'Admin', { permission: 'admin:access', minimumPlan: 'enterprise' }),
  workspace('notifications', 'notifications', 'Notifications'),
] as const;

export function getWorkspaceRoute(id: WorkspaceRouteId) {
  return workspaceRoutes.find((route) => route.id === id);
}
