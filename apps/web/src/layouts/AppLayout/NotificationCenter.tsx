import { Bell } from 'lucide-react';
import { Badge, Button, Popover, StatusDot } from '@/shared/ui';

const notifications = [
  { id: '1', text: 'Your weekly report is ready.', time: '5 min ago', unread: true },
  { id: '2', text: 'A teammate mentioned you.', time: '1 hour ago', unread: true },
  { id: '3', text: 'Workspace settings were updated.', time: 'Yesterday', unread: false },
] as const;

export function NotificationCenter() {
  const unread = notifications.filter((item) => item.unread).length;
  return (
    <Popover
      content={<div><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Notifications</h2><Badge tone="primary">{unread} new</Badge></div><ul className="divide-y divide-slate-200 dark:divide-slate-700">{notifications.map((item) => <li className="py-3 first:pt-0 last:pb-0" key={item.id}><div className="flex items-start gap-2">{item.unread ? <StatusDot aria-label="Unread" className="mt-1" label="" status="info" /> : null}<div><p className="text-sm">{item.text}</p><p className="mt-1 text-xs text-slate-500">{item.time}</p></div></div></li>)}</ul></div>}
      label="Notifications"
    >
      <span className="relative inline-flex"><Button aria-label={`Notifications, ${unread} unread`} size="sm" variant="ghost"><Bell size={19} /></Button>{unread ? <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" /> : null}</span>
    </Popover>
  );
}
