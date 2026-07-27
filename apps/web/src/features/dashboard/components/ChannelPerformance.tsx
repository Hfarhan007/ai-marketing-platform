import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartCard } from '@/shared/ui';
import type { NamedValue } from '../types/dashboard.types';

export function ChannelPerformance({ channels }: { channels: readonly NamedValue[] }) {
  return <ChartCard description="Share of attributed leads by source." title="Channel performance"><div className="grid h-full grid-cols-1 items-center sm:grid-cols-[1fr_auto]"><ResponsiveContainer height={240} width="100%"><PieChart><Pie cx="50%" cy="50%" data={[...channels]} dataKey="value" innerRadius={58} nameKey="name" outerRadius={88} paddingAngle={3}>{channels.map((channel) => <Cell fill={channel.color ?? 'var(--color-primary)'} key={channel.name} />)}</Pie><Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 8 }} formatter={(value) => [`${String(value)}%`, 'Share']} /></PieChart></ResponsiveContainer><ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-1">{channels.map((channel) => <li className="flex items-center gap-2" key={channel.name}><span className="size-2.5 rounded-full" style={{ backgroundColor: channel.color }} /><span className="text-slate-500 dark:text-slate-400">{channel.name}</span><strong className="ml-auto">{channel.value}%</strong></li>)}</ul></div></ChartCard>;
}
