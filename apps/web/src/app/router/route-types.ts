import type { FeatureFlag } from '@/app/config/feature-flags.config';
import type { Permission } from '@/app/config/permissions.config';
import type { PlanId } from '@/app/config/plans.config';

export type RouteScope = 'public' | 'guest' | 'protected' | 'workspace';

export interface RouteMetadata {
  breadcrumb: string;
  description?: string;
  featureFlag?: FeatureFlag;
  minimumPlan?: PlanId;
  permission?: Permission;
  scope: RouteScope;
  title: string;
}

export interface AppRouteDefinition<Id extends string = string> {
  id: Id;
  metadata: RouteMetadata;
  path: string;
}

export type GuestRouteId =
  | 'login' | 'register' | 'forgotPassword' | 'resetPassword' | 'verifyEmail' | 'twoFactor'
  | 'recoveryCode' | 'sessionExpired' | 'accountLocked' | 'acceptInvite' | 'logout';
export type OnboardingRouteId = 'onboarding' | 'workspace' | 'industry' | 'goals' | 'channels' | 'team' | 'branding' | 'summary';
export type WorkspaceRouteId =
  | 'dashboard' | 'contacts' | 'contactDetails' | 'companies' | 'leads' | 'deals'
  | 'pipeline' | 'tasks' | 'inbox' | 'conversation' | 'workflows' | 'workflowNew'
  | 'workflowDetails' | 'aiAgents' | 'agentDetails' | 'knowledgeBase' | 'campaigns' | 'metaAds'
  | 'calendar' | 'appointments' | 'forms' | 'landingPages' | 'funnels' | 'analytics' | 'leadSourceReport'
  | 'mediaLibrary' | 'integrations' | 'developerPortal' | 'team' | 'billing'
  | 'settings' | 'consentManagement' | 'compliance' | 'admin' | 'notifications';
