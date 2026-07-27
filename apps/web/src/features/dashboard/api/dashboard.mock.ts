import type { DashboardData, DashboardRange } from '../types/dashboard.types';

const baseData: DashboardData = {
  metrics: {
    activeCampaigns: 12,
    aiUsage: 6842,
    appointments: 186,
    conversionRate: 18.7,
    qualifiedLeads: 1284,
    revenue: 284650,
    totalLeads: 8429,
    unreadConversations: 37,
  },
  leadGrowth: [
    { label: 'Week 1', previous: 820, value: 940 },
    { label: 'Week 2', previous: 910, value: 1080 },
    { label: 'Week 3', previous: 980, value: 1210 },
    { label: 'Week 4', previous: 1040, value: 1390 },
    { label: 'Week 5', previous: 1180, value: 1520 },
    { label: 'Week 6', previous: 1260, value: 1710 },
  ],
  revenue: [
    { label: 'Jan', previous: 32000, value: 39000 },
    { label: 'Feb', previous: 36000, value: 42500 },
    { label: 'Mar', previous: 39500, value: 46800 },
    { label: 'Apr', previous: 41000, value: 51200 },
    { label: 'May', previous: 44500, value: 53600 },
    { label: 'Jun', previous: 47000, value: 57900 },
  ],
  funnel: [
    { name: 'Visitors', value: 24800 },
    { name: 'Leads', value: 8429 },
    { name: 'Qualified', value: 1284 },
    { name: 'Appointments', value: 186 },
    { name: 'Customers', value: 94 },
  ],
  activities: [
    { description: 'Spring launch exceeded its target by 18%.', id: 'a1', time: '8 min ago', title: 'Campaign milestone reached', type: 'campaign' },
    { description: 'Morgan Lee entered the qualified stage.', id: 'a2', time: '24 min ago', title: 'Lead status updated', type: 'contact' },
    { description: 'A new website conversation needs a reply.', id: 'a3', time: '42 min ago', title: 'Conversation assigned', type: 'message' },
    { description: 'Quarterly review preparation was completed.', id: 'a4', time: '1 hour ago', title: 'Task completed', type: 'task' },
  ],
  appointments: [
    { attendee: 'Jamie Foster', id: 'p1', time: '09:30 AM', title: 'Discovery call' },
    { attendee: 'Taylor Brooks', id: 'p2', time: '11:00 AM', title: 'Product walkthrough' },
    { attendee: 'Avery Patel', id: 'p3', time: '02:30 PM', title: 'Quarterly review' },
  ],
  insights: [
    { description: 'Email leads convert 32% better when contacted within two hours.', id: 'i1', impact: 'high', title: 'Prioritize rapid follow-up' },
    { description: 'The enterprise segment is trending above its six-week average.', id: 'i2', impact: 'medium', title: 'Enterprise demand is rising' },
    { description: 'Three active campaigns have overlapping audiences.', id: 'i3', impact: 'low', title: 'Review audience overlap' },
  ],
  tasks: [
    { completed: 18, label: 'Due today', total: 24 },
    { completed: 42, label: 'This week', total: 58 },
    { completed: 7, label: 'Overdue resolved', total: 11 },
  ],
  campaigns: [
    { conversions: 428, name: 'Spring product launch', revenue: 84200, status: 'active' },
    { conversions: 317, name: 'Enterprise nurture', revenue: 73900, status: 'active' },
    { conversions: 186, name: 'Customer expansion', revenue: 51400, status: 'paused' },
    { conversions: 94, name: 'Partner co-marketing', revenue: 28700, status: 'draft' },
  ],
  channels: [
    { color: '#6366f1', name: 'Organic', value: 34 },
    { color: '#06b6d4', name: 'Email', value: 27 },
    { color: '#8b5cf6', name: 'Paid', value: 22 },
    { color: '#f59e0b', name: 'Referral', value: 17 },
  ],
  team: [
    { deals: 18, name: 'Alex', revenue: 68200 },
    { deals: 16, name: 'Sam', revenue: 59400 },
    { deals: 14, name: 'Jordan', revenue: 52800 },
    { deals: 11, name: 'Morgan', revenue: 43100 },
    { deals: 9, name: 'Casey', revenue: 36700 },
  ],
};

export async function getMockDashboard(workspaceId: string, range: DashboardRange): Promise<DashboardData> {
  await new Promise((resolve) => window.setTimeout(resolve, 900));
  void range;
  if (workspaceId === 'error') throw new Error('The mock dashboard request failed.');
  if (workspaceId === 'empty') {
    return { ...baseData, metrics: { ...baseData.metrics, totalLeads: 0 }, activities: [], appointments: [], campaigns: [], channels: [], funnel: [], insights: [], leadGrowth: [], revenue: [], tasks: [], team: [] };
  }
  return structuredClone(baseData);
}
