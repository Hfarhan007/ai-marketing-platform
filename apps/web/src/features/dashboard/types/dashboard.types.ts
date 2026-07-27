export interface DashboardMetrics {
  activeCampaigns: number;
  aiUsage: number;
  appointments: number;
  conversionRate: number;
  qualifiedLeads: number;
  revenue: number;
  totalLeads: number;
  unreadConversations: number;
}

export interface TimeSeriesPoint {
  label: string;
  previous: number;
  value: number;
}

export interface NamedValue {
  color?: string;
  name: string;
  value: number;
}

export interface ActivityItem {
  description: string;
  id: string;
  time: string;
  title: string;
  type: 'campaign' | 'contact' | 'message' | 'task';
}

export interface Appointment {
  attendee: string;
  id: string;
  time: string;
  title: string;
}

export interface Insight {
  description: string;
  id: string;
  impact: 'high' | 'medium' | 'low';
  title: string;
}

export interface TaskSummary {
  completed: number;
  label: string;
  total: number;
}

export interface CampaignRow {
  conversions: number;
  name: string;
  revenue: number;
  status: 'active' | 'draft' | 'paused';
}

export interface TeamMemberPerformance {
  deals: number;
  name: string;
  revenue: number;
}

export interface DashboardData {
  activities: ActivityItem[];
  appointments: Appointment[];
  campaigns: CampaignRow[];
  channels: NamedValue[];
  funnel: NamedValue[];
  insights: Insight[];
  leadGrowth: TimeSeriesPoint[];
  metrics: DashboardMetrics;
  revenue: TimeSeriesPoint[];
  tasks: TaskSummary[];
  team: TeamMemberPerformance[];
}

export type DashboardRange = '7d' | '30d' | '90d' | '12m';
