import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/shared/ui';
import type { TimeSeriesPoint } from '../types/dashboard.types';

export function RevenueChart({ data }: { data: readonly TimeSeriesPoint[] }) {
  return <ChartCard description="Attributed revenue over time." title="Revenue trend"><ResponsiveContainer height={280} width="100%"><AreaChart data={[...data]} margin={{ left: 0, right: 8, top: 8 }}><defs><linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={12} tickLine={false} /><YAxis fontSize={12} tickFormatter={(value: number) => `$${value / 1000}k`} tickLine={false} /><Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 8 }} formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} /><Area dataKey="value" fill="url(#revenueFill)" stroke="#10b981" strokeWidth={3} type="monotone" /></AreaChart></ResponsiveContainer></ChartCard>;
}
