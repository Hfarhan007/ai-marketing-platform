import { Download, LayoutDashboard, RefreshCw, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '@/app/providers';
import { Button, EmptyState, ErrorState, Select, Skeleton } from '@/shared/ui';
import { AIInsightsPanel } from '../components/AIInsightsPanel';
import { CampaignPerformance } from '../components/CampaignPerformance';
import { ChannelPerformance } from '../components/ChannelPerformance';
import { FunnelChart } from '../components/FunnelChart';
import { LeadGrowthChart } from '../components/LeadGrowthChart';
import { OverviewMetrics } from '../components/OverviewMetrics';
import { RecentActivity } from '../components/RecentActivity';
import { RevenueChart } from '../components/RevenueChart';
import { TasksOverview } from '../components/TasksOverview';
import { TeamPerformance } from '../components/TeamPerformance';
import { UpcomingAppointments } from '../components/UpcomingAppointments';
import { useDashboard } from '../hooks/use-dashboard';
import type { DashboardRange } from '../types/dashboard.types';

const workspaceOptions = [
  { label: 'Acme Studio', value: 'demo-workspace' },
  { label: 'Northstar Labs', value: 'northstar' },
  { label: 'Demo Sandbox', value: 'sandbox' },
];

const rangeOptions = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Last 12 months', value: '12m' },
];

function DashboardSkeleton() {
  return <div aria-label="Loading dashboard" className="grid gap-6" role="status"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton className="h-36" key={index} />)}</div><div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div><Skeleton className="h-80" /></div>;
}

export function DashboardPage() {
  const { workspaceId = 'demo-workspace' } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [range, setRange] = useState<DashboardRange>('30d');
  const { data, error, isError, isFetching, isLoading, refetch } = useDashboard(workspaceId, range);

  const exportDashboard = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dashboard-${workspaceId}-${range}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify({ title: 'Dashboard exported', description: 'Mock dashboard data was saved as JSON.', tone: 'success' });
  };

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Workspace overview</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Monitor performance and recent momentum from one place.</p></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
          <Select aria-label="Workspace" className="lg:w-44" onChange={(event) => void navigate(`/app/${event.target.value}/dashboard`)} options={workspaceOptions} value={workspaceId} />
          <Select aria-label="Date range" className="lg:w-40" onChange={(event) => setRange(event.target.value as DashboardRange)} options={rangeOptions} value={range} />
          <Button aria-label="Refresh dashboard" loading={isFetching && !isLoading} onClick={() => void refetch()} variant="outline"><RefreshCw size={16} />Refresh</Button>
          <Button disabled={!data} onClick={exportDashboard} variant="outline"><Download size={16} />Export</Button>
          <Button onClick={() => notify({ title: 'Customization coming soon', description: 'Dashboard layout controls are a frontend placeholder.', tone: 'info' })} variant="ghost"><Settings2 size={16} />Customize</Button>
        </div>
      </header>

      {isLoading ? <DashboardSkeleton /> : null}
      {isError ? <ErrorState description={error instanceof Error ? error.message : 'The mock dashboard could not be loaded.'} loading={isFetching} onRetry={() => void refetch()} title="Dashboard unavailable" /> : null}
      {data && !isError && data.metrics.totalLeads === 0 ? <EmptyState action={<Button onClick={() => void navigate('/app/demo-workspace/dashboard')}>Load sample workspace</Button>} description="This workspace does not have mock dashboard activity yet." icon={<LayoutDashboard size={28} />} title="No dashboard data" /> : null}

      {data && data.metrics.totalLeads > 0 ? <>
        <OverviewMetrics metrics={data.metrics} />
        <div className="grid min-w-0 gap-6 xl:grid-cols-2"><LeadGrowthChart data={data.leadGrowth} /><RevenueChart data={data.revenue} /></div>
        <div className="grid min-w-0 gap-6 xl:grid-cols-[1.2fr_0.8fr]"><FunnelChart data={data.funnel} /><AIInsightsPanel insights={data.insights} /></div>
        <div className="grid gap-6 xl:grid-cols-3"><div className="xl:col-span-2"><CampaignPerformance campaigns={data.campaigns} /></div><TasksOverview tasks={data.tasks} /></div>
        <div className="grid min-w-0 gap-6 xl:grid-cols-2"><ChannelPerformance channels={data.channels} /><TeamPerformance team={data.team} /></div>
        <div className="grid gap-6 xl:grid-cols-2"><RecentActivity items={data.activities} /><UpcomingAppointments items={data.appointments} /></div>
      </> : null}
    </div>
  );
}

export default DashboardPage;
