import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from './Button';
import { cn } from '@/shared/utils/cn';

export interface CalendarProps {
  disabled?: boolean;
  max?: Date;
  min?: Date;
  onChange?: (date: Date) => void;
  value?: Date;
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export function Calendar({ disabled, max, min, onChange, value }: CalendarProps) {
  const [month, setMonth] = useState(() => new Date(value?.getFullYear() ?? new Date().getFullYear(), value?.getMonth() ?? new Date().getMonth(), 1));
  const days = useMemo(() => {
    const firstDay = month.getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array.from({ length: firstDay }, () => null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))];
  }, [month]);
  return <section aria-label="Calendar" className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
    <header className="mb-3 flex items-center justify-between"><Button aria-label="Previous month" disabled={disabled} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} size="sm" variant="ghost"><ChevronLeft size={16} /></Button><h2 aria-live="polite" className="font-semibold">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><Button aria-label="Next month" disabled={disabled} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} size="sm" variant="ghost"><ChevronRight size={16} /></Button></header>
    <div className="grid grid-cols-7 text-center text-xs text-slate-500">{weekdays.map((day) => <span className="py-1" key={day}>{day}</span>)}</div>
    <div className="grid grid-cols-7 gap-1">{days.map((date, index) => date ? <button aria-pressed={value ? sameDay(date, value) : false} className={cn('aspect-square rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-30', value && sameDay(date, value) ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800', sameDay(date, new Date()) && !(value && sameDay(date, value)) && 'ring-1 ring-indigo-500')} disabled={disabled || Boolean(min && date < min) || Boolean(max && date > max)} key={date.toISOString()} onClick={() => onChange?.(date)} type="button">{date.getDate()}</button> : <span aria-hidden="true" key={`empty-${index}`} />)}</div>
  </section>;
}
