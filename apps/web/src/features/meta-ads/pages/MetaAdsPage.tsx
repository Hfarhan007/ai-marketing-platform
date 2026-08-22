import {
  BarChart3,
  Share2 as Facebook,
  FileText,
  Image,
  Layers3,
  Megaphone,
  MousePointerClick,
  Target,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  EmptyState,
  ErrorState,
  Input,
  MetricCard,
  Select,
  Skeleton,
  Table,
  type TableColumn,
} from '@/shared/ui';
import {
  useMetaAudiences,
  useMetaCampaigns,
  useMetaConnections,
  useMetaInsights,
  useMetaLeads,
  useMetaRecords,
} from '../hooks';
import type { MetaAdsSection, MetaCampaign, MetaInsight, MetaRecord } from '../types';
const sections: Array<{ id: MetaAdsSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'ad-sets', label: 'Ad Sets' },
  { id: 'ads', label: 'Ads' },
  { id: 'creatives', label: 'Creatives' },
  { id: 'audiences', label: 'Audiences' },
  { id: 'lead-forms', label: 'Lead Forms' },
  { id: 'leads', label: 'Leads' },
  { id: 'analytics', label: 'Analytics' },
];
const valid = new Set(sections.map(({ id }) => id));
const iso = (date: Date) => date.toISOString().slice(0, 10),
  money = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value),
  number = (value: number) => new Intl.NumberFormat().format(Math.round(value)),
  percent = (value: number) => `${value.toFixed(2)}%`;
function summary(rows: MetaInsight[]) {
  const total = rows.reduce(
    (result, row) => ({
      spend: result.spend + row.spend,
      impressions: result.impressions + row.impressions,
      reach: result.reach + row.reach,
      clicks: result.clicks + row.clicks,
      leads: result.leads + row.leads,
      conversions: result.conversions + row.conversions,
      purchaseValue: result.purchaseValue + (row.purchaseValue ?? 0),
    }),
    { spend: 0, impressions: 0, reach: 0, clicks: 0, leads: 0, conversions: 0, purchaseValue: 0 },
  );
  return {
    ...total,
    ctr: total.impressions ? (total.clicks / total.impressions) * 100 : 0,
    cpc: total.clicks ? total.spend / total.clicks : 0,
    cpm: total.impressions ? (total.spend / total.impressions) * 1000 : 0,
    cpl: total.leads ? total.spend / total.leads : 0,
    cpa: total.conversions ? total.spend / total.conversions : 0,
    roas: total.spend && total.purchaseValue ? total.purchaseValue / total.spend : undefined,
  };
}
function RecordTable({ rows, label }: { rows: MetaRecord[]; label: string }) {
  const columns: TableColumn<MetaRecord>[] = [
    {
      key: 'name',
      header: label,
      render: (row) => <span className="font-medium">{row.name ?? row.id}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={(row.effective_status ?? row.status) === 'ACTIVE' ? 'success' : 'neutral'}>
          {String(row.effective_status ?? row.status ?? 'Unknown')}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: 'Meta ID',
      render: (row) => <span className="font-mono text-xs text-slate-500">{row.id}</span>,
    },
  ];
  return (
    <Table
      columns={columns}
      emptyMessage={`No ${label.toLowerCase()} found.`}
      getRowKey={(row) => row.id}
      rows={rows}
    />
  );
}
export function MetaAdsPage() {
  const { workspaceId = '', section = 'overview' } = useParams(),
    active = (valid.has(section as MetaAdsSection) ? section : 'overview') as MetaAdsSection,
    connections = useMetaConnections();
  const [connectionId, setConnectionId] = useState(''),
    [campaignId, setCampaignId] = useState(''),
    [since, setSince] = useState(() => iso(new Date(Date.now() - 29 * 86400000))),
    [until, setUntil] = useState(() => iso(new Date()));
  const selectedConnection = connections.data?.find(
      ({ id }) => id === (connectionId || connections.data?.[0]?.id),
    ),
    resolvedConnectionId = selectedConnection?.id ?? '',
    campaigns = useMetaCampaigns(resolvedConnectionId),
    selectedCampaignId = campaignId || campaigns.data?.[0]?.id || '',
    selectedCampaign = campaigns.data?.find(({ id }) => id === campaignId),
    insights = useMetaInsights(resolvedConnectionId, since, until, 'campaign'),
    visibleInsights = selectedCampaign?.externalCampaignId
      ? (insights.data ?? []).filter(
          ({ campaignId: id }) => id === selectedCampaign.externalCampaignId,
        )
      : (insights.data ?? []),
    adsets = useMetaRecords('adsets', resolvedConnectionId, selectedCampaignId),
    ads = useMetaRecords('ads', resolvedConnectionId, selectedCampaignId),
    audiences = useMetaAudiences(resolvedConnectionId),
    leads = useMetaLeads(),
    totals = summary(visibleInsights);
  const loading = connections.isLoading || campaigns.isLoading || insights.isLoading;
  if (connections.isError)
    return (
      <ErrorState onRetry={() => void connections.refetch()} title="Unable to load Meta accounts" />
    );
  if (!connections.isLoading && !connections.data?.length)
    return (
      <EmptyState
        action={
          <Link
            className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white"
            to={`/app/${workspaceId}/integrations`}
          >
            Connect Meta
          </Link>
        }
        description="Connect Facebook and select an Ad Account before opening Meta Ads."
        icon={<Facebook />}
        title="Meta is not connected"
      />
    );
  const filters = (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-700 dark:bg-slate-900">
      <Select
        label="Ad account connection"
        onChange={(event) => {
          setConnectionId(event.target.value);
          setCampaignId('');
        }}
        options={(connections.data ?? []).map((item) => ({ label: item.name, value: item.id }))}
        value={resolvedConnectionId}
      />
      <Select
        label="Campaign"
        onChange={(event) => setCampaignId(event.target.value)}
        options={(campaigns.data ?? []).map((item) => ({ label: item.name, value: item.id }))}
        placeholder="All campaigns"
        value={campaignId}
      />
      <Input
        label="From"
        max={until}
        onChange={(event) => setSince(event.target.value)}
        type="date"
        value={since}
      />
      <Input
        label="To"
        max={iso(new Date())}
        min={since}
        onChange={(event) => setUntil(event.target.value)}
        type="date"
        value={until}
      />
    </div>
  );
  const metrics: Array<[string, string]> = [
    ['Spend', money(totals.spend)],
    ['Impressions', number(totals.impressions)],
    ['Reach', number(totals.reach)],
    ['Clicks', number(totals.clicks)],
    ['CTR', percent(totals.ctr)],
    ['CPC', money(totals.cpc)],
    ['CPM', money(totals.cpm)],
    ['Leads', number(totals.leads)],
    ['CPL', money(totals.cpl)],
    ['Conversions', number(totals.conversions)],
    ['CPA', money(totals.cpa)],
    ['ROAS', totals.roas === undefined ? '—' : `${totals.roas.toFixed(2)}×`],
  ];
  const campaignColumns: TableColumn<MetaCampaign>[] = [
    {
      key: 'name',
      header: 'Campaign',
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    { key: 'objective', header: 'Objective', render: (row) => row.objective ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'running' ? 'success' : 'neutral'}>
          {row.providerStatus ?? row.status}
        </Badge>
      ),
    },
  ];
  let content;
  if (loading)
    content = (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton className="h-32" key={index} />
        ))}
      </div>
    );
  else if (insights.isError)
    content = (
      <ErrorState
        onRetry={() => void insights.refetch()}
        title="Meta Ads data could not be loaded"
      />
    );
  else if (active === 'overview')
    content = insights.data?.length ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <MetricCard key={label} label={label} value={value} />
        ))}
      </div>
    ) : (
      <EmptyState
        description="No delivery metrics were returned for this account and date range."
        icon={<BarChart3 />}
        title="No Meta insights"
      />
    );
  else if (active === 'campaigns')
    content = (
      <Table
        columns={campaignColumns}
        emptyMessage="No Meta campaigns found."
        getRowKey={(row) => row.id}
        rows={campaigns.data ?? []}
      />
    );
  else if (active === 'ad-sets')
    content = adsets.isError ? (
      <ErrorState onRetry={() => void adsets.refetch()} />
    ) : (
      <RecordTable label="Ad Set" rows={adsets.data ?? []} />
    );
  else if (active === 'ads')
    content = ads.isError ? (
      <ErrorState onRetry={() => void ads.refetch()} />
    ) : (
      <RecordTable label="Ad" rows={ads.data ?? []} />
    );
  else if (active === 'audiences')
    content = audiences.isError ? (
      <ErrorState onRetry={() => void audiences.refetch()} />
    ) : (
      <div className="grid gap-6 xl:grid-cols-2">
        <RecordTable label="Custom Audience" rows={audiences.data?.custom ?? []} />
        <RecordTable label="Saved Audience" rows={audiences.data?.saved ?? []} />
      </div>
    );
  else if (active === 'lead-forms') {
    const forms =
      selectedConnection?.publicMetadata.selectedResources?.filter(
        ({ type }) => type === 'lead_form',
      ) ?? [];
    content = forms.length ? (
      <RecordTable
        label="Lead Form"
        rows={forms.map(({ id, name }) => ({ id, name }))}
      />
    ) : (
      <EmptyState
        description="Select Lead Forms from the Meta integration configuration."
        icon={<FileText />}
        title="No Lead Forms selected"
      />
    );
  } else if (active === 'leads') {
    content = leads.isError ? (
      <ErrorState onRetry={() => void leads.refetch()} />
    ) : (
      <Table
        columns={[
          {
            key: 'name',
            header: 'Lead',
            render: (row) => <span className="font-medium">{row.name}</span>,
          },
          { key: 'source', header: 'Source', render: (row) => <Badge>{row.source}</Badge> },
          { key: 'status', header: 'Status', render: (row) => row.status },
          { key: 'score', header: 'Score', render: (row) => row.score },
        ]}
        emptyMessage="No Meta leads have been ingested."
        getRowKey={(row) => row.id ?? row._id ?? row.name}
        rows={leads.data ?? []}
      />
    );
  } else if (active === 'analytics') {
    content = insights.data?.length ? (
      <Table
        columns={[
          { key: 'name', header: 'Campaign', render: (row) => row.campaignName ?? 'Account total' },
          { key: 'spend', header: 'Spend', render: (row) => money(row.spend) },
          { key: 'impressions', header: 'Impressions', render: (row) => number(row.impressions) },
          { key: 'clicks', header: 'Clicks', render: (row) => number(row.clicks) },
          { key: 'leads', header: 'Leads', render: (row) => number(row.leads) },
          {
            key: 'roas',
            header: 'ROAS',
            render: (row) => (row.roas ? `${row.roas.toFixed(2)}×` : '—'),
          },
        ]}
        getRowKey={(row) => row.campaignId ?? row.dateStart ?? String(row.spend)}
        rows={insights.data}
      />
    ) : (
      <EmptyState title="No analytics available" />
    );
  } else
    content = (
      <EmptyState
        description="Create creatives from an existing Meta campaign using assets from the Media Library."
        icon={<Image />}
        title="No creatives available"
      />
    );
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-sm font-medium text-indigo-600">Meta advertising</p>
        <h1 className="text-3xl font-bold">Meta Ads</h1>
        <p className="text-sm text-slate-500">
          Manage Facebook and Instagram advertising from the connected workspace account.
        </p>
      </header>
      <nav
        aria-label="Meta Ads sections"
        className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3 dark:border-slate-700"
      >
        {sections.map(({ id, label }) => (
          <Link
            className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap ${active === id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            key={id}
            to={`/app/${workspaceId}/meta-ads/${id}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {filters}
      <section aria-labelledby="meta-section-title" className="grid gap-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold" id="meta-section-title">
          {active === 'campaigns' ? (
            <Megaphone />
          ) : active === 'ad-sets' ? (
            <Layers3 />
          ) : active === 'ads' ? (
            <MousePointerClick />
          ) : active === 'audiences' ? (
            <Users />
          ) : active === 'analytics' ? (
            <BarChart3 />
          ) : (
            <Target />
          )}
          {sections.find(({ id }) => id === active)?.label}
        </h2>
        {content}
      </section>
    </div>
  );
}
export default MetaAdsPage;
