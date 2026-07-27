import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/shared/ui';
import type { TimeSeriesPoint } from '../types/dashboard.types';

export function LeadGrowthChart({ data }: { data: readonly TimeSeriesPoint[] }) {
  return <ChartCard description="New leads compared with the previous period." title="Lead growth"><ResponsiveContainer height={280} width="100%"><LineChart data={[...data]} margin={{ left: -20, right: 8, top: 8 }}><CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" /><XAxis dataKey="label" fontSize={12} tickLine={false} /><YAxis fontSize={12} tickLine={false} /><Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 8 }} /><Legend /><Line dataKey="value" dot={false} name="Current" stroke="#6366f1" strokeWidth={3} type="monotone" /><Line dataKey="previous" dot={false} name="Previous" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} type="monotone" /></LineChart></ResponsiveContainer></ChartCard>;
}
