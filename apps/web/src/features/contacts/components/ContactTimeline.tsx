import { Calendar, Mail, Phone, RefreshCw } from 'lucide-react';
import type { ContactActivity } from '../types/contacts.types';

const icons = { call: Phone, email: Mail, meeting: Calendar, note: Mail, status: RefreshCw };

export function ContactTimeline({ activities }: { activities: readonly ContactActivity[] }) {
  return <section><h2 className="text-base font-semibold">Activity timeline</h2><ol className="mt-4 space-y-0">{activities.map((activity, index) => { const Icon = icons[activity.type]; return <li className="relative flex gap-3 pb-6" key={activity.id}>{index < activities.length - 1 ? <span className="absolute left-4 top-8 h-full w-px bg-slate-200 dark:bg-slate-700" /> : null}<span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Icon size={15} /></span><div><div className="flex flex-wrap items-baseline gap-x-2"><strong className="text-sm">{activity.title}</strong><time className="text-xs text-slate-500">{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(activity.occurredAt))}</time></div><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{activity.description}</p></div></li>; })}</ol></section>;
}
