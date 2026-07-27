import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/shared/ui';
import type { NamedValue } from '../types/dashboard.types';

export function FunnelChart({ data }: { data: readonly NamedValue[] }) {
  return <ChartCard description="Progression from audience to customer." title="Conversion funnel"><ResponsiveContainer height={280} width="100%"><BarChart data={[...data]} layout="vertical" margin={{ left: 8, right: 24 }}><CartesianGrid horizontal={false} stroke="var(--color-border)" strokeDasharray="3 3" /><XAxis fontSize={12} type="number" /><YAxis dataKey="name" fontSize={12} type="category" width={92} /><Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 8 }} /><Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></ChartCard>;
}
