import {
  BarChart3,
  Bot,
  CalendarDays,
  Contact,
  CreditCard,
  FileText,
  Filter,
  Inbox,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  Network,
  Plug,
  Settings,
  Shield,
  Users,
  Workflow,
  Bell,
  BriefcaseBusiness,
  Code2,
  FolderOpen,
  ListTodo,
  Scale,
  UserCheck,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { Permission } from './permissions.config';
import type { FeatureFlag } from './feature-flags.config';
import type { PlanId } from './plans.config';

export interface NavigationItem {
  group: 'Workspace' | 'Engage' | 'Build' | 'Insights' | 'Manage';
  href: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  label: string;
  permission?: Permission;
  featureFlag?: FeatureFlag;
  minimumPlan?: PlanId;
}

export const navigationConfig: readonly NavigationItem[] = [
  { group: 'Workspace', href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { group: 'Workspace', href: '/contacts', icon: Users, label: 'Contacts', permission: 'contacts:read' },
  { group: 'Workspace', href: '/pipelines', icon: Filter, label: 'Pipelines' },
  { group: 'Engage', href: '/inbox', icon: Inbox, label: 'Inbox' },
  { group: 'Engage', href: '/campaigns', icon: Megaphone, label: 'Campaigns', permission: 'campaigns:read' },
  { group: 'Engage', href: '/meta-ads/overview', icon: BarChart3, label: 'Meta Ads', permission: 'campaigns:read' },
  { group: 'Engage', href: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { group: 'Engage', href: '/tasks', icon: ListTodo, label: 'Tasks' },
  { group: 'Engage', href: '/notifications', icon: Bell, label: 'Notifications' },
  { group: 'Engage', href: '/appointments', icon: BriefcaseBusiness, label: 'Appointments' },
  { group: 'Build', href: '/media-library', icon: FolderOpen, label: 'Media library' },
  { group: 'Build', href: '/workflows', icon: Workflow, label: 'Workflows', featureFlag: 'workflowAutomation', minimumPlan: 'pro' },
  { group: 'Build', href: '/agents', icon: Bot, label: 'AI agents', featureFlag: 'aiAgents', minimumPlan: 'pro' },
  { group: 'Build', href: '/knowledge-base', icon: FileText, label: 'Knowledge base', minimumPlan: 'pro' },
  { group: 'Build', href: '/forms', icon: Contact, label: 'Forms' },
  { group: 'Build', href: '/pages', icon: LayoutTemplate, label: 'Landing pages' },
  { group: 'Build', href: '/funnels', icon: Network, label: 'Funnels' },
  { group: 'Insights', href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { group: 'Insights', href: '/analytics/lead-sources', icon: BarChart3, label: 'Lead sources', permission: 'leads:read' },
  { group: 'Manage', href: '/integrations', icon: Plug, label: 'Integrations' },
  { group: 'Manage', href: '/team', icon: Users, label: 'Team', permission: 'team:manage' },
  { group: 'Manage', href: '/billing', icon: CreditCard, label: 'Billing', permission: 'settings:manage' },
  { group: 'Manage', href: '/settings', icon: Settings, label: 'Settings', permission: 'settings:manage' },
  { group: 'Manage', href: '/developer', icon: Code2, label: 'Developer portal', permission: 'settings:manage', minimumPlan: 'pro' },
  { group: 'Manage', href: '/consent', icon: UserCheck, label: 'Consent', permission: 'settings:manage' },
  { group: 'Manage', href: '/compliance', icon: Scale, label: 'Compliance', permission: 'settings:manage', minimumPlan: 'enterprise' },
  { group: 'Manage', href: '/admin', icon: Shield, label: 'Admin', permission: 'admin:access', minimumPlan: 'enterprise' },
];
