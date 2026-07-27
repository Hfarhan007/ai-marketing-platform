import { Sparkles } from 'lucide-react';
import { Badge } from '@/shared/ui';
import type { Insight } from '../types/dashboard.types';

const tones = { high: 'danger', medium: 'warning', low: 'neutral' } as const;

export function AIInsightsPanel({ insights }: { insights: readonly Insight[] }) {
  return <section className="overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm dark:border-indigo-900 dark:from-indigo-950/50 dark:to-slate-900"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-indigo-600 text-white"><Sparkles size={17} /></span><div><h2 className="font-semibold">AI insights</h2><p className="text-xs text-slate-500 dark:text-slate-400">Mock recommendations from current trends</p></div></div><ul className="mt-4 space-y-3">{insights.map((insight) => <li className="rounded-lg border border-indigo-100 bg-white/80 p-3 dark:border-indigo-900 dark:bg-slate-900/70" key={insight.id}><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{insight.title}</p><Badge tone={tones[insight.impact]}>{insight.impact}</Badge></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{insight.description}</p></li>)}</ul></section>;
}
