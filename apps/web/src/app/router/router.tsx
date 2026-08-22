import { type ReactElement } from 'react';
import { createBrowserRouter, type RouteObject, RouterProvider } from 'react-router-dom';
import { AccessibilityShell } from '../../accessibility';
import { RouteErrorBoundary } from '../../errors';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { FullscreenLayout } from '@/layouts/FullscreenLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { WorkspaceProvider } from '@/app/providers';
import { FeatureFlagRoute } from './feature-flag-route';
import { GuestRoute } from './guest-route';
import { lazyRoute } from './lazy-route';
import { PermissionRoute } from './permission-route';
import { ProtectedRoute } from './protected-route';
import { guestRoutes, onboardingRoutes, workspaceRoutes } from './route-config';
import { RouteMetadataManager } from './route-metadata';
import type { RouteMetadata, WorkspaceRouteId } from './route-types';
import { SubscriptionRoute } from './subscription-route';
import { WorkspaceRoute } from './workspace-route';

const LandingPage = lazyRoute(() => import('./pages/landing-page'));
const AuthPage = lazyRoute(() => import('./pages/auth-page'));
const OnboardingPage = lazyRoute(() => import('./pages/onboarding-page'));
const UnauthorizedPage = lazyRoute(() => import('./pages/unauthorized-page'));
const UpgradeRequiredPage = lazyRoute(() => import('./pages/upgrade-required-page'));
const NotFoundPage = lazyRoute(() => import('./pages/not-found-page'));
const DashboardPage = lazyRoute(() => import('@/features/dashboard'));
const ContactsPage = lazyRoute(() => import('@/features/contacts').then(({ ContactsPage: defaultPage }) => ({ default: defaultPage })));
const ContactDetailsPage = lazyRoute(() => import('@/features/contacts').then(({ ContactDetailsPage: defaultPage }) => ({ default: defaultPage })));
const CompaniesPage = lazyRoute(() => import('@/features/companies'));
const LeadsPage = lazyRoute(() => import('@/features/leads'));
const DealsPage = lazyRoute(() => import('@/features/deals'));
const PipelinePage = lazyRoute(() => import('@/features/pipeline'));
const TasksPage = lazyRoute(() => import('@/features/tasks'));
const InboxPage = lazyRoute(() => import('@/features/inbox'));
const WorkflowListPage = lazyRoute(() => import('@/features/workflows').then(({ WorkflowListPage: defaultPage }) => ({ default: defaultPage })));
const WorkflowBuilderPage = lazyRoute(() => import('@/features/workflows').then(({ WorkflowBuilderPage: defaultPage }) => ({ default: defaultPage })));
const AgentsPage = lazyRoute(() => import('@/features/ai-agents').then(({ AgentsPage: defaultPage }) => ({ default: defaultPage })));
const AgentDetailsPage = lazyRoute(() => import('@/features/ai-agents').then(({ AgentDetailsPage: defaultPage }) => ({ default: defaultPage })));
const KnowledgeBasePage = lazyRoute(() => import('@/features/ai-agents').then(({ KnowledgeBasePage: defaultPage }) => ({ default: defaultPage })));
const CampaignsPage = lazyRoute(() => import('@/features/campaigns'));
const MetaAdsPage = lazyRoute(() => import('@/features/meta-ads'));
const CalendarPage = lazyRoute(() => import('@/features/calendar'));
const AppointmentsPage = lazyRoute(() => import('@/features/appointments'));
const FormsPage = lazyRoute(() => import('@/features/forms'));
const LandingPagesPage = lazyRoute(() => import('@/features/landing-pages'));
const FunnelsPage = lazyRoute(() => import('@/features/funnels'));
const AnalyticsPage = lazyRoute(() => import('@/features/analytics'));
const LeadSourceReportPage = lazyRoute(() => import('@/features/source-reporting'));
const MediaLibraryPage = lazyRoute(() => import('@/features/media-library'));
const IntegrationsPage = lazyRoute(() => import('@/features/integrations'));
const DeveloperPortalPage = lazyRoute(() => import('@/features/developer-portal'));
const TeamPage = lazyRoute(() => import('@/features/team'));
const BillingPage = lazyRoute(() => import('@/features/billing'));
const SettingsPage = lazyRoute(() => import('@/features/settings'));
const ConsentPage = lazyRoute(() => import('@/features/consent-management'));
const CompliancePage = lazyRoute(() => import('@/features/compliance'));
const AdminPage = lazyRoute(() => import('@/features/admin'));
const NotificationsPage = lazyRoute(() => import('@/features/notifications'));
const DesignSystemPage = lazyRoute(() => import('../design-system/DesignSystemPage').then(({ DesignSystemPage: defaultPage }) => ({ default: defaultPage })));

const workspacePages: Record<WorkspaceRouteId, ReactElement> = {
  dashboard: <DashboardPage />, contacts: <ContactsPage />, contactDetails: <ContactDetailsPage />,
  companies: <CompaniesPage />, leads: <LeadsPage />, deals: <DealsPage />, pipeline: <PipelinePage />,
  tasks: <TasksPage />, inbox: <InboxPage />, conversation: <InboxPage />, workflows: <WorkflowListPage />,
  workflowNew: <WorkflowBuilderPage />, workflowDetails: <WorkflowBuilderPage />, aiAgents: <AgentsPage />,
  agentDetails: <AgentDetailsPage />, knowledgeBase: <KnowledgeBasePage />, campaigns: <CampaignsPage />,metaAds:<MetaAdsPage/>,
  calendar: <CalendarPage />, appointments: <AppointmentsPage />, forms: <FormsPage />,
  landingPages: <LandingPagesPage />, funnels: <FunnelsPage />, analytics: <AnalyticsPage />,leadSourceReport:<LeadSourceReportPage/>,
  mediaLibrary: <MediaLibraryPage />, integrations: <IntegrationsPage />, developerPortal: <DeveloperPortalPage />,
  team: <TeamPage />, billing: <BillingPage />, settings: <SettingsPage />, consentManagement: <ConsentPage />,
  compliance: <CompliancePage />, admin: <AdminPage />, notifications: <NotificationsPage />,
};

function withAccess(page: ReactElement, metadata: RouteMetadata) {
  let result = page;
  if (metadata.featureFlag) result = <FeatureFlagRoute flag={metadata.featureFlag}>{result}</FeatureFlagRoute>;
  if (metadata.minimumPlan) result = <SubscriptionRoute minimumPlan={metadata.minimumPlan}>{result}</SubscriptionRoute>;
  if (metadata.permission) result = <PermissionRoute permission={metadata.permission}>{result}</PermissionRoute>;
  return result;
}

function ApplicationRouteShell() {
  return <><RouteMetadataManager /><AccessibilityShell /></>;
}

const workspaceChildren: RouteObject[] = workspaceRoutes.map((route) => ({
  path: route.path,
  element: withAccess(workspacePages[route.id], route.metadata),
  errorElement: <RouteErrorBoundary />,
  handle: { metadata: route.metadata },
}));
const onboardingChildren: RouteObject[] = onboardingRoutes.map((route) => ({
  ...(route.path ? { path: route.path } : { index: true }),
  element: <OnboardingPage />,
  errorElement: <RouteErrorBoundary />,
  handle: { metadata: route.metadata },
}));

const routeTree: RouteObject[] = [{
  element: <ApplicationRouteShell />,
  errorElement: <RouteErrorBoundary />,
  children: [
    { path: '/', element: <PublicLayout />, handle: { metadata: { breadcrumb: 'Home', scope: 'public', title: 'Marketing workspace' } satisfies RouteMetadata }, children: [{ index: true, element: <LandingPage /> }] },
    { element: <GuestRoute />, children: [{ element: <AuthLayout title="Account access" />, children: guestRoutes.map((route) => ({ path: route.path, element: <AuthPage />, handle: { metadata: route.metadata }, errorElement: <RouteErrorBoundary /> })) }] },
    { path: '/logout', element: <ProtectedRoute><AuthLayout title="Account access" /></ProtectedRoute>, children: [{ index: true, element: <AuthPage />, handle: { metadata: { breadcrumb: 'Sign out', scope: 'protected', title: 'Sign out' } satisfies RouteMetadata } }] },
    { path: '/onboarding', element: <ProtectedRoute />, children: [{ element: <FullscreenLayout label="Workspace onboarding" />, children: onboardingChildren }] },
    { path: '/app/:workspaceId', element: <ProtectedRoute><WorkspaceRoute /></ProtectedRoute>, children: [{ element: <WorkspaceProvider><AppLayout /></WorkspaceProvider>, children: workspaceChildren }] },
    { path: '/unauthorized', element: <UnauthorizedPage />, handle: { metadata: { breadcrumb: 'Unauthorized', scope: 'protected', title: 'Access denied' } satisfies RouteMetadata } },
    { path: '/upgrade-required', element: <UpgradeRequiredPage />, handle: { metadata: { breadcrumb: 'Upgrade required', scope: 'protected', title: 'Upgrade required' } satisfies RouteMetadata } },
    { path: '/not-found', element: <NotFoundPage />, handle: { metadata: { breadcrumb: 'Not found', scope: 'public', title: 'Page not found' } satisfies RouteMetadata } },
    { path: '/design-system', element: <DesignSystemPage />, handle: { metadata: { breadcrumb: 'Design system', scope: 'public', title: 'Design system' } satisfies RouteMetadata } },
    { path: '*', element: <NotFoundPage />, handle: { metadata: { breadcrumb: 'Not found', scope: 'public', title: 'Page not found' } satisfies RouteMetadata } },
  ],
}];

const router = createBrowserRouter(routeTree);
export function AppRouter() { return <RouterProvider router={router} />; }
