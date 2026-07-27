import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from '@/shared/ui';
import type { TeamMemberPerformance } from '../types/dashboard.types';

export function TeamPerformance({ team }: { team: readonly TeamMemberPerformance[] }) {
  return <ChartCard description="Revenue contribution across the team." title="Team performance"><ResponsiveContainer height={280} width="100%"><BarChart data={[...team]} margin={{ left: 4, right: 8, top: 8 }}><CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={12} tickLine={false} /><YAxis fontSize={12} tickFormatter={(value: number) => `$${value / 1000}k`} tickLine={false} /><Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 8 }} formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Revenue']} /><Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>;
}
