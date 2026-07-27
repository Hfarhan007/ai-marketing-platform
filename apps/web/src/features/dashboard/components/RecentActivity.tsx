import { CheckCircle2, Mail, Megaphone, UserRound } from 'lucide-react';
import type { ActivityItem } from '../types/dashboard.types';

const icons = { campaign: Megaphone, contact: UserRound, message: Mail, task: CheckCircle2 };

export function RecentActivity({ items }: { items: readonly ActivityItem[] }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><h2 className="font-semibold">Recent activity</h2><ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">{items.map((item) => { const Icon = icons[item.type]; return <li className="flex gap-3 py-3 first:pt-0 last:pb-0" key={item.id}><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Icon size={17} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium">{item.title}</p><time className="text-xs text-slate-400">{item.time}</time></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.description}</p></div></li>; })}</ul></section>;
}
