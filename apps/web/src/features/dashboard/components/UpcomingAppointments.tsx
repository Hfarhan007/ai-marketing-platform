import { CalendarClock, Video } from 'lucide-react';
import { Button } from '@/shared/ui';
import type { Appointment } from '../types/dashboard.types';

export function UpcomingAppointments({ items }: { items: readonly Appointment[] }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="font-semibold">Upcoming appointments</h2><CalendarClock className="text-slate-400" size={19} /></div><ul className="mt-4 space-y-3">{items.map((item) => <li className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60" key={item.id}><span className="min-w-16 text-xs font-semibold text-indigo-600 dark:text-indigo-400">{item.time}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="truncate text-xs text-slate-500">{item.attendee}</p></div><Button aria-label={`Join ${item.title}`} size="sm" variant="ghost"><Video size={16} /></Button></li>)}</ul></section>;
}
