import { Bot, CalendarCheck, CircleDollarSign, Mail, Megaphone, Percent, UserCheck, Users } from 'lucide-react';
import { MetricCard } from '@/shared/ui';
import type { DashboardMetrics } from '../types/dashboard.types';

export interface OverviewMetricsProps {
  metrics: DashboardMetrics;
}

export function OverviewMetrics({ metrics }: OverviewMetricsProps) {
  const cards = [
    { change: 12.4, icon: Users, label: 'Total leads', value: metrics.totalLeads.toLocaleString() },
    { change: 8.7, icon: UserCheck, label: 'Qualified leads', value: metrics.qualifiedLeads.toLocaleString() },
    { change: 6.2, icon: CalendarCheck, label: 'Appointments', value: metrics.appointments.toLocaleString() },
    { change: 2.1, icon: Percent, label: 'Conversion rate', value: `${metrics.conversionRate}%` },
    { change: 14.8, icon: CircleDollarSign, label: 'Revenue', value: `$${metrics.revenue.toLocaleString()}` },
    { change: 4.3, icon: Megaphone, label: 'Active campaigns', value: metrics.activeCampaigns },
    { change: -9.4, icon: Mail, label: 'Unread conversations', value: metrics.unreadConversations },
    { change: 18.6, icon: Bot, label: 'AI usage', value: metrics.aiUsage.toLocaleString() },
  ] as const;
  return <section aria-label="Overview metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ icon: Icon, ...card }) => <MetricCard description="vs previous period" icon={<Icon size={20} />} key={card.label} {...card} />)}</section>;
}
